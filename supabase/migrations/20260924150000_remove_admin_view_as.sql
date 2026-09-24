-- Admins may no longer "view as" any student. View-as stays limited to the
-- student's own family: parent, Manager of that parent, co-guardian.
-- An account holding admin AND parent keeps view-as for its own children
-- through the parent branch only.

-- 1) can_impersonate_student(): drop the admin branch. This gates both the
-- impersonation_logs INSERT (log-first view-as) and create-student-account,
-- so admins can neither enter a student view nor mint a student login.
CREATE OR REPLACE FUNCTION public.can_impersonate_student(p_student_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = p_student_id
      AND s.parent_id IN (SELECT public.get_managed_parent_ids(auth.uid()))
  )
$$;
REVOKE ALL ON FUNCTION public.can_impersonate_student(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_impersonate_student(uuid) TO authenticated, service_role;

-- 2) Admin read policies added only to feed admin view-as and used by no
-- admin page. Kept: check_ins, activity_logs, reward_points,
-- reward_redemptions (AdminEngagement / AdminOverview / AdminRewards).
DROP POLICY IF EXISTS "admin reads daily_plan" ON public.daily_plan;
DROP POLICY IF EXISTS "admin reads subject_tracks" ON public.subject_tracks;
DROP POLICY IF EXISTS "admin reads ai_conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "admin reads achievements" ON public.achievements;
DROP POLICY IF EXISTS "admin reads learning_tools" ON public.learning_tools;

-- Rollback: restore the "public.has_role(auth.uid(), 'admin') OR" branch in
-- can_impersonate_student() and recreate the 5 policies from
-- 20260924120000_student_accounts.sql section 7.
