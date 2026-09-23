-- Rename the "Monitor" role to "Manager" everywhere in the schema.
--
-- RENAME only (no DROP + CREATE of any table/column), so every existing row
-- -- including Aristilde Deslande's role -- is kept. Policies, FKs and indexes
-- follow a table/column rename automatically (they bind by oid); only their
-- NAMES are renamed below for consistency. The one thing that does NOT follow
-- is get_managed_parent_ids(): a SQL function body stores table names as
-- text, so it is recreated here in the same transaction -- otherwise RLS on
-- the 13 "parent manages X" tables would break the moment the table is
-- renamed.
--
-- Rollback: the reverse RENAMEs + UPDATE user_roles SET role='monitor' +
-- restoring the old CHECK and the old get_managed_parent_ids() body (see
-- 20260922150000_monitor_role_and_coguardian_rls.sql).

-- 1) monitor_parents -> manager_parents (monitor_id -> manager_id)
ALTER TABLE public.monitor_parents RENAME TO manager_parents;
ALTER TABLE public.manager_parents RENAME COLUMN monitor_id TO manager_id;
ALTER TABLE public.manager_parents RENAME CONSTRAINT monitor_parents_pkey TO manager_parents_pkey;
ALTER TABLE public.manager_parents RENAME CONSTRAINT monitor_parents_monitor_id_parent_id_key TO manager_parents_manager_id_parent_id_key;
ALTER TABLE public.manager_parents RENAME CONSTRAINT monitor_parents_monitor_id_fkey TO manager_parents_manager_id_fkey;
ALTER TABLE public.manager_parents RENAME CONSTRAINT monitor_parents_parent_id_fkey TO manager_parents_parent_id_fkey;
ALTER POLICY "admin manages monitor_parents" ON public.manager_parents RENAME TO "admin manages manager_parents";
ALTER POLICY "monitor reads own managed parents" ON public.manager_parents RENAME TO "manager reads own managed parents";
ALTER POLICY "parent reads own monitor link" ON public.manager_parents RENAME TO "parent reads own manager link";
ALTER POLICY "service role manages monitor_parents" ON public.manager_parents RENAME TO "service role manages manager_parents";

-- 2) monitor_requests -> manager_requests
ALTER TABLE public.monitor_requests RENAME TO manager_requests;
ALTER TABLE public.manager_requests RENAME CONSTRAINT monitor_requests_pkey TO manager_requests_pkey;
ALTER TABLE public.manager_requests RENAME CONSTRAINT monitor_requests_status_check TO manager_requests_status_check;
ALTER TABLE public.manager_requests RENAME CONSTRAINT monitor_requests_user_id_fkey TO manager_requests_user_id_fkey;
ALTER TABLE public.manager_requests RENAME CONSTRAINT monitor_requests_reviewed_by_fkey TO manager_requests_reviewed_by_fkey;
ALTER POLICY "admin manages monitor_requests" ON public.manager_requests RENAME TO "admin manages manager_requests";
ALTER POLICY "service role manages monitor_requests" ON public.manager_requests RENAME TO "service role manages manager_requests";
ALTER POLICY "user creates own monitor_requests" ON public.manager_requests RENAME TO "user creates own manager_requests";
ALTER POLICY "user reads own monitor_requests" ON public.manager_requests RENAME TO "user reads own manager_requests";

-- 3) subscriptions.covered_by_monitor_id -> covered_by_manager_id
ALTER TABLE public.subscriptions RENAME COLUMN covered_by_monitor_id TO covered_by_manager_id;
ALTER TABLE public.subscriptions RENAME CONSTRAINT subscriptions_covered_by_monitor_id_fkey TO subscriptions_covered_by_manager_id_fkey;

-- 4) user_roles: 'monitor' -> 'manager' (UPDATE in place, rows kept)
ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_role_check;
UPDATE public.user_roles SET role = 'manager' WHERE role = 'monitor';
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role = ANY (ARRAY['admin'::text, 'parent'::text, 'student'::text, 'manager'::text]));

-- 5) Recreate the RLS helper against the renamed table (same logic).
CREATE OR REPLACE FUNCTION public.get_managed_parent_ids(_uid uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _uid
  UNION
  SELECT parent_id FROM public.manager_parents WHERE manager_id = _uid
  UNION
  SELECT parent_id FROM public.co_guardians WHERE guardian_id = _uid
$function$;

-- 6) Manager dashboard: the caller's own families only. Scoped by the same
-- manager_parents link the RLS above uses (manager_id = auth.uid()). Returns
-- a minimal summary -- never the parent's full profile (e.g. telegram_chat_id).
CREATE OR REPLACE FUNCTION public.get_my_managed_families()
RETURNS TABLE (parent_id uuid, display_name text, email text, student_count bigint, added_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT mp.parent_id,
         p.display_name,
         u.email::text,
         (SELECT count(*) FROM public.students s WHERE s.parent_id = mp.parent_id),
         mp.created_at
  FROM public.manager_parents mp
  LEFT JOIN public.profiles p ON p.id = mp.parent_id
  LEFT JOIN auth.users u ON u.id = mp.parent_id
  WHERE mp.manager_id = auth.uid()
  ORDER BY mp.created_at DESC
$function$;

REVOKE ALL ON FUNCTION public.get_my_managed_families() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_managed_families() TO authenticated;
