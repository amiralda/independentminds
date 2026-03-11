
-- Fix privilege escalation: prevent parent from changing student_id on update
DROP POLICY IF EXISTS "students_update" ON public.students;

CREATE POLICY "students_update" ON public.students
  FOR UPDATE TO authenticated
  USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id AND student_id IS NOT DISTINCT FROM (SELECT s.student_id FROM public.students s WHERE s.ctid = students.ctid));
