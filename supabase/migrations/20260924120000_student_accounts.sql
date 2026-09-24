-- Student login accounts + a working 'student' role + audited "view as student".
-- Additive only: new column/tables/functions/policies/triggers. No existing
-- policy is changed or dropped; handle_new_user() keeps its exact behaviour
-- for every signup that does not match a server-created student invite.

-- 1) Link a students row to its own auth account --------------------------
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2) Server-side invites. Linking is driven by THIS table, never by
-- user metadata: raw_user_meta_data is client-controlled on a normal signUp,
-- so trusting a metadata flag would let anyone claim any student row.
-- RLS on + no policies = only the service role (create-student-account) can
-- read or write it.
CREATE TABLE IF NOT EXISTS public.student_account_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_row_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour'),
  consumed_at timestamptz,
  consumed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS student_account_invites_email_idx
  ON public.student_account_invites (lower(email)) WHERE consumed_at IS NULL;
ALTER TABLE public.student_account_invites ENABLE ROW LEVEL SECURITY;

-- 3) Helpers ----------------------------------------------------------------
-- The caller's own students row (NULL if the caller is not a student).
CREATE OR REPLACE FUNCTION public.get_my_student_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$ SELECT id FROM public.students WHERE user_id = auth.uid() $$;
REVOKE ALL ON FUNCTION public.get_my_student_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_student_id() TO authenticated, service_role;

-- Who may "view as" a student: admins, or anyone whose managed parent set
-- (self / Manager families / co-guardian links) owns the student.
CREATE OR REPLACE FUNCTION public.can_impersonate_student(p_student_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = p_student_id
        AND s.parent_id IN (SELECT public.get_managed_parent_ids(auth.uid()))
    )
  )
$$;
REVOKE ALL ON FUNCTION public.can_impersonate_student(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_impersonate_student(uuid) TO authenticated, service_role;

-- Subscription the caller's access is judged by: their own row, or -- for a
-- linked student with none -- their parent's. Returns status fields only.
CREATE OR REPLACE FUNCTION public.get_my_effective_subscription()
RETURNS TABLE (status text, plan_key text, current_period_end timestamptz, trial_ends_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT sub.status, sub.plan_key, sub.current_period_end, sub.trial_ends_at
  FROM public.subscriptions sub
  WHERE sub.user_id = COALESCE(
    (SELECT s2.user_id FROM public.subscriptions s2 WHERE s2.user_id = auth.uid()),
    (SELECT st.parent_id FROM public.students st WHERE st.user_id = auth.uid())
  )
$$;
REVOKE ALL ON FUNCTION public.get_my_effective_subscription() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_effective_subscription() TO authenticated, service_role;

-- 4) handle_new_user(): new branch for invited students only ---------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  v_invite record;
begin
  -- Student account created by create-student-account (service role): an
  -- unexpired, unconsumed invite for this exact email must already exist.
  select * into v_invite
    from public.student_account_invites
   where lower(email) = lower(NEW.email)
     and consumed_at is null
     and expires_at > now()
   order by created_at desc
   limit 1
   for update;

  if found then
    insert into public.profiles (id, display_name, preferred_language, adult_confirmed, adult_confirmed_at)
    values (
      NEW.id,
      coalesce(NEW.raw_user_meta_data->>'display_name', 'Student'),
      coalesce(NEW.raw_user_meta_data->>'language', 'en'),
      false,
      null
    );
    insert into public.user_roles (user_id, role) values (NEW.id, 'student');
    update public.students set user_id = NEW.id
     where id = v_invite.student_row_id and user_id is null;
    if not found then
      raise exception 'Student row already has a login account';
    end if;
    update public.student_account_invites
       set consumed_at = now(), consumed_by = NEW.id
     where id = v_invite.id;
    return NEW;
  end if;

  -- Unchanged behaviour for every other signup.
  if coalesce((NEW.raw_user_meta_data->>'adult_confirmed')::boolean, false) != true then
    raise exception 'Adult confirmation required';
  end if;
  insert into public.profiles (id, display_name, preferred_language, adult_confirmed, adult_confirmed_at)
  values (
    NEW.id,
    coalesce(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      'User'
    ),
    coalesce(NEW.raw_user_meta_data->>'language','en'),
    true,
    now()
  );
  insert into public.user_roles (user_id, role) values (NEW.id, 'parent');
  return NEW;
end;
$function$;

-- 5) Student RLS: own row / own student_id only (never siblings) -----------
CREATE POLICY "student reads own row" ON public.students
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "student updates own row (photo only, enforced by trigger)" ON public.students
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "student reads own daily_plan" ON public.daily_plan
  FOR SELECT TO authenticated USING (student_id = public.get_my_student_id());
CREATE POLICY "student updates own daily_plan status (enforced by trigger)" ON public.daily_plan
  FOR UPDATE TO authenticated USING (student_id = public.get_my_student_id())
  WITH CHECK (student_id = public.get_my_student_id());

CREATE POLICY "student reads own subject_tracks" ON public.subject_tracks
  FOR SELECT TO authenticated USING (student_id = public.get_my_student_id());

CREATE POLICY "student reads own check_ins" ON public.check_ins
  FOR SELECT TO authenticated USING (student_id = public.get_my_student_id());
CREATE POLICY "student creates own check_ins" ON public.check_ins
  FOR INSERT TO authenticated WITH CHECK (student_id = public.get_my_student_id());

CREATE POLICY "student reads own ai_conversations" ON public.ai_conversations
  FOR SELECT TO authenticated USING (student_id = public.get_my_student_id());
CREATE POLICY "student creates own ai_conversations" ON public.ai_conversations
  FOR INSERT TO authenticated WITH CHECK (student_id = public.get_my_student_id());
CREATE POLICY "student updates own ai_conversations" ON public.ai_conversations
  FOR UPDATE TO authenticated USING (student_id = public.get_my_student_id())
  WITH CHECK (student_id = public.get_my_student_id());

CREATE POLICY "student reads own achievements" ON public.achievements
  FOR SELECT TO authenticated USING (student_id = public.get_my_student_id());
CREATE POLICY "student reads own reward_points" ON public.reward_points
  FOR SELECT TO authenticated USING (student_id = public.get_my_student_id());
CREATE POLICY "student reads own activity_logs" ON public.activity_logs
  FOR SELECT TO authenticated USING (student_id = public.get_my_student_id());

-- Photo upload into the student's own folder (folder = students.student_id,
-- the same convention the parent policy and the UI already use).
CREATE POLICY "student manages own photo folder" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'student-photos'
         AND (storage.foldername(name))[1] = (SELECT s.student_id FROM public.students s WHERE s.user_id = auth.uid()))
  WITH CHECK (bucket_id = 'student-photos'
         AND (storage.foldername(name))[1] = (SELECT s.student_id FROM public.students s WHERE s.user_id = auth.uid()));

-- 6) Column guards for a student editing their own rows --------------------
-- Only when the caller IS the linked student and has no manager-level right
-- over the row (parents/Managers/admins/service role are unaffected).
CREATE OR REPLACE FUNCTION public.guard_student_self_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND OLD.user_id = auth.uid()
     AND NOT public.can_impersonate_student(OLD.id)
     AND (to_jsonb(NEW) - 'profile_photo_url') IS DISTINCT FROM (to_jsonb(OLD) - 'profile_photo_url') THEN
    RAISE EXCEPTION 'Students may only change their own profile photo' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_student_self_update ON public.students;
CREATE TRIGGER guard_student_self_update
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.guard_student_self_update();

-- Marking a task started/done: status plus its own start/end timestamps.
CREATE OR REPLACE FUNCTION public.guard_student_daily_plan_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND OLD.student_id = public.get_my_student_id()
     AND NOT public.can_impersonate_student(OLD.student_id)
     AND (to_jsonb(NEW) - 'status' - 'actual_start' - 'actual_end')
         IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'actual_start' - 'actual_end') THEN
    RAISE EXCEPTION 'Students may only change a task''s status' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_student_daily_plan_update ON public.daily_plan;
CREATE TRIGGER guard_student_daily_plan_update
  BEFORE UPDATE ON public.daily_plan
  FOR EACH ROW EXECUTE FUNCTION public.guard_student_daily_plan_update();

-- 7) Admin read-only access to per-student data (for admin "view as") -----
CREATE POLICY "admin reads daily_plan" ON public.daily_plan FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin reads subject_tracks" ON public.subject_tracks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin reads check_ins" ON public.check_ins FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin reads ai_conversations" ON public.ai_conversations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin reads achievements" ON public.achievements FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin reads reward_points" ON public.reward_points FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin reads activity_logs" ON public.activity_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin reads learning_tools" ON public.learning_tools FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin reads reward_redemptions" ON public.reward_redemptions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 8) Audit log for "view as student" --------------------------------------
CREATE TABLE IF NOT EXISTS public.impersonation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_role text NOT NULL,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('start', 'end')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.impersonation_logs ENABLE ROW LEVEL SECURITY;

-- actor_id / actor_role / created_at are set server-side so they can't be spoofed.
CREATE OR REPLACE FUNCTION public.stamp_impersonation_log()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.actor_id := auth.uid();
  END IF;
  NEW.created_at := now();
  NEW.actor_role := CASE
    WHEN EXISTS (SELECT 1 FROM public.students s WHERE s.id = NEW.student_id AND s.parent_id = NEW.actor_id) THEN 'parent'
    WHEN EXISTS (SELECT 1 FROM public.students s JOIN public.manager_parents mp ON mp.parent_id = s.parent_id
                 WHERE s.id = NEW.student_id AND mp.manager_id = NEW.actor_id) THEN 'manager'
    WHEN EXISTS (SELECT 1 FROM public.students s JOIN public.co_guardians cg ON cg.parent_id = s.parent_id
                 WHERE s.id = NEW.student_id AND cg.guardian_id = NEW.actor_id) THEN 'co_guardian'
    WHEN public.has_role(NEW.actor_id, 'admin') THEN 'admin'
    ELSE 'unknown'
  END;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS stamp_impersonation_log ON public.impersonation_logs;
CREATE TRIGGER stamp_impersonation_log
  BEFORE INSERT ON public.impersonation_logs
  FOR EACH ROW EXECUTE FUNCTION public.stamp_impersonation_log();

CREATE POLICY "actor logs allowed impersonation" ON public.impersonation_logs
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() AND public.can_impersonate_student(student_id));
CREATE POLICY "actor reads own impersonation logs" ON public.impersonation_logs
  FOR SELECT TO authenticated USING (actor_id = auth.uid());
CREATE POLICY "admin reads impersonation logs" ON public.impersonation_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
-- No UPDATE / DELETE policies: the audit trail is append-only for users.

-- Rollback (reverse order): drop the policies/triggers/functions/tables added
-- above, ALTER TABLE students DROP COLUMN user_id, and restore the previous
-- handle_new_user() body (only the "Unchanged behaviour" branch).
