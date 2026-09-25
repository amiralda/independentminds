-- Security audit 2026-09-25: database hardening (LOW findings). Additive /
-- tightening only; every change keeps the existing app paths working
-- (verified end to end with real test accounts).

-- 1) has_role(user_id, role) answered for ANY user id, so any signed-in user
--    could learn who is an admin/manager. RLS policies and the client only
--    ever ask about auth.uid(); edge functions ask via the service role
--    (auth.uid() IS NULL). Keep those, refuse everything else.
CREATE OR REPLACE FUNCTION public.has_role(user_id uuid, role text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  select (auth.uid() is null or $1 = auth.uid())
     and exists (
       select 1 from public.user_roles
       where user_roles.user_id = $1 and user_roles.role = $2
     );
$$;

-- 2) get_managed_parent_ids(_uid) listed the families ANY user manages.
--    Same rule: only your own id (or server-side calls).
CREATE OR REPLACE FUNCTION public.get_managed_parent_ids(_uid uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM (
    SELECT _uid AS id
    UNION
    SELECT parent_id FROM public.manager_parents WHERE manager_id = _uid
    UNION
    SELECT parent_id FROM public.co_guardians WHERE guardian_id = _uid
  ) ids
  WHERE auth.uid() IS NULL OR _uid = auth.uid()
$$;

-- 3) Trigger functions were executable through /rest/v1/rpc by anon and
--    authenticated. Triggers don't need the caller's EXECUTE privilege, so
--    revoking changes nothing for the triggers themselves.
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prorettype = 'trigger'::regtype
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
  END LOOP;
END $$;

-- 4) students.user_id (which login account IS this student) could be set by
--    the parent to any account id. Linking is server-side only
--    (handle_new_user, service role); clients may still unlink (set NULL).
CREATE OR REPLACE FUNCTION public.guard_student_user_link()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.user_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.user_id IS DISTINCT FROM OLD.user_id) THEN
    RAISE EXCEPTION 'Student logins can only be linked by the server' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.guard_student_user_link() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_student_user_link ON public.students;
CREATE TRIGGER guard_student_user_link
  BEFORE INSERT OR UPDATE OF user_id ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.guard_student_user_link();

-- 5) student_duplicate_exists(name, dob) searches every family (by design,
--    to catch a child added twice) and is a yes/no oracle for "is this child
--    on the platform". Cap it at 30 checks per user per hour.
DROP FUNCTION IF EXISTS public.student_duplicate_exists(text, date);
CREATE FUNCTION public.student_duplicate_exists(p_display_name text, p_date_of_birth date)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rate json;
BEGIN
  IF auth.uid() IS NULL OR p_date_of_birth IS NULL
     OR length(btrim(coalesce(p_display_name, ''))) < 2 THEN
    RETURN false;
  END IF;
  v_rate := public.increment_rate_limit(auth.uid(), 'student_duplicate_check', date_trunc('hour', now()), 30);
  IF NOT (v_rate->>'allowed')::boolean THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.date_of_birth = p_date_of_birth
      AND lower(regexp_replace(btrim(s.display_name), '\s+', ' ', 'g'))
        = lower(regexp_replace(btrim(p_display_name), '\s+', ' ', 'g'))
  );
END;
$$;
REVOKE ALL ON FUNCTION public.student_duplicate_exists(text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.student_duplicate_exists(text, date) TO authenticated, service_role;

-- 6) student-photos bucket accepted any file type and size.
UPDATE storage.buckets
SET file_size_limit = 10 * 1024 * 1024,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
WHERE id = 'student-photos';

-- Rollback:
--   has_role / get_managed_parent_ids: previous bodies without the auth.uid() guard
--     (see 20260924150000_remove_admin_view_as.sql and earlier migrations).
--   GRANT EXECUTE ON FUNCTION <trigger fns> TO anon, authenticated;
--   DROP TRIGGER guard_student_user_link ON public.students; DROP FUNCTION public.guard_student_user_link();
--   student_duplicate_exists: previous LANGUAGE sql body without the rate limit
--     (20260922180000_duplicate_check_and_super_pro.sql).
--   UPDATE storage.buckets SET file_size_limit = NULL, allowed_mime_types = NULL WHERE id = 'student-photos';
