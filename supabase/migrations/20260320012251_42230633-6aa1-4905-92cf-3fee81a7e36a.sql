
-- Create a security definer function to get current student_id without triggering RLS
CREATE OR REPLACE FUNCTION public.get_student_id_by_parent(_parent_id uuid, _student_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students
    WHERE student_id = _student_id AND parent_id = _parent_id
  )
$$;

-- Fix: Replace students_update policy to avoid self-referencing query
DROP POLICY IF EXISTS "students_update" ON public.students;
CREATE POLICY "students_update" ON public.students
  FOR UPDATE TO authenticated
  USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);
