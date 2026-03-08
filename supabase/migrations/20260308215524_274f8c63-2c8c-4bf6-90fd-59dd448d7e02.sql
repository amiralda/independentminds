
-- Fix 1: Students can't update parent linkage - restrict students_update to parents only
DROP POLICY IF EXISTS "students_update" ON public.students;
CREATE POLICY "students_update" ON public.students
  FOR UPDATE TO authenticated
  USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);

-- Fix 2: Only parents can award achievements, not students themselves
DROP POLICY IF EXISTS "achievements_insert" ON public.achievements;
CREATE POLICY "achievements_insert" ON public.achievements
  FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'parent' AND is_my_student(student_id));
