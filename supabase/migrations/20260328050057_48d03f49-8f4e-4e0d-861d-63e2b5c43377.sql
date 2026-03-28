
DROP POLICY "parent_manages_invites" ON public.guardian_invites;

CREATE POLICY "parent_manages_invites"
ON public.guardian_invites
FOR ALL
TO public
USING (
  (invited_by = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.students
    WHERE students.student_id = guardian_invites.student_id
      AND students.parent_id = auth.uid()
  )
)
WITH CHECK (
  (invited_by = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.students
    WHERE students.student_id = guardian_invites.student_id
      AND students.parent_id = auth.uid()
  )
);
