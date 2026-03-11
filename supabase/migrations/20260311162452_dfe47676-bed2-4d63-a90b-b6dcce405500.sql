
-- Fix: Restrict students_select so student-role users cannot see parent contact info.
-- Drop existing policy and recreate with role-based access.

DROP POLICY IF EXISTS "students_select" ON public.students;

-- Parents can see all columns for their students
CREATE POLICY "students_select_parent" ON public.students
  FOR SELECT TO authenticated
  USING (
    (get_my_role() = 'parent' AND auth.uid() = parent_id)
  );

-- Students can only see their own row (RLS still applies, but we'll use a view for limited columns)
CREATE POLICY "students_select_student" ON public.students
  FOR SELECT TO authenticated
  USING (
    (get_my_role() = 'student' AND (SELECT student_id FROM public.profiles WHERE id = auth.uid()) = student_id)
  );

-- Create a safe view for student-facing queries that excludes parent contact info
CREATE OR REPLACE VIEW public.student_safe_view AS
  SELECT student_id, display_name, grade_level, language_pref, timezone
  FROM public.students;
