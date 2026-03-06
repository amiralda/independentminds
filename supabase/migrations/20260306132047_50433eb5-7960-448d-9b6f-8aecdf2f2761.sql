
-- Helper function: get the student_id for the current authenticated user
CREATE OR REPLACE FUNCTION public.get_my_student_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT student_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Helper function: get the role for the current authenticated user
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- ============ daily_plan RLS ============
DROP POLICY IF EXISTS "Daily plan viewable by all" ON public.daily_plan;
DROP POLICY IF EXISTS "Daily plan insertable by all" ON public.daily_plan;
DROP POLICY IF EXISTS "Daily plan updatable by all" ON public.daily_plan;
DROP POLICY IF EXISTS "Daily plan deletable by all" ON public.daily_plan;

-- Students see own rows; parents see all
CREATE POLICY "daily_plan_select" ON public.daily_plan
  FOR SELECT TO authenticated
  USING (
    student_id = public.get_my_student_id()
    OR public.get_my_role() = 'parent'
  );

-- Parents can insert
CREATE POLICY "daily_plan_insert" ON public.daily_plan
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() = 'parent'
  );

-- Students update own; parents update all
CREATE POLICY "daily_plan_update" ON public.daily_plan
  FOR UPDATE TO authenticated
  USING (
    student_id = public.get_my_student_id()
    OR public.get_my_role() = 'parent'
  );

-- Parents can delete
CREATE POLICY "daily_plan_delete" ON public.daily_plan
  FOR DELETE TO authenticated
  USING (
    public.get_my_role() = 'parent'
  );

-- ============ check_ins RLS ============
DROP POLICY IF EXISTS "Check-ins viewable by all" ON public.check_ins;
DROP POLICY IF EXISTS "Check-ins insertable by all" ON public.check_ins;
DROP POLICY IF EXISTS "Check-ins updatable by all" ON public.check_ins;

-- Students insert own; parents cannot insert check-ins
CREATE POLICY "check_ins_insert" ON public.check_ins
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = public.get_my_student_id()
  );

-- Students see own; parents see all
CREATE POLICY "check_ins_select" ON public.check_ins
  FOR SELECT TO authenticated
  USING (
    student_id = public.get_my_student_id()
    OR public.get_my_role() = 'parent'
  );

-- Students update own
CREATE POLICY "check_ins_update" ON public.check_ins
  FOR UPDATE TO authenticated
  USING (
    student_id = public.get_my_student_id()
  );
