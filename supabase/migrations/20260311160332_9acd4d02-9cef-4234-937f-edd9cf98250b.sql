-- Fix: students_insert requires parent role
DROP POLICY IF EXISTS "students_insert" ON public.students;
CREATE POLICY "students_insert" ON public.students FOR INSERT TO authenticated
  WITH CHECK ((get_my_role() = 'parent') AND (auth.uid() = parent_id));