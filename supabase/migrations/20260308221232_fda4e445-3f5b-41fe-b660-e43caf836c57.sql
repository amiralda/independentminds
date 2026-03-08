
-- Add missing UPDATE policy on achievements (parent-only, matching INSERT)
CREATE POLICY "achievements_update"
ON public.achievements
FOR UPDATE
TO authenticated
USING (get_my_role() = 'parent' AND is_my_student(student_id))
WITH CHECK (get_my_role() = 'parent' AND is_my_student(student_id));

-- Add missing DELETE policy on check_ins
CREATE POLICY "check_ins_delete"
ON public.check_ins
FOR DELETE
TO authenticated
USING (is_my_student(student_id));
