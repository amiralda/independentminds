
-- Fix: daily_plan UPDATE WITH CHECK must enforce student_id ownership
DROP POLICY IF EXISTS "daily_plan_update" ON public.daily_plan;
CREATE POLICY "daily_plan_update" ON public.daily_plan
  FOR UPDATE TO authenticated
  USING (is_my_student(student_id))
  WITH CHECK (is_my_student(student_id));
