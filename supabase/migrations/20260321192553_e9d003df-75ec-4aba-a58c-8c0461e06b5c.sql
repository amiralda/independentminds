-- Fix: Restrict challenge updates to parents only, preventing student self-manipulation
DROP POLICY IF EXISTS "challenges_update" ON public.challenges;
CREATE POLICY "challenges_update" ON public.challenges
  FOR UPDATE
  TO authenticated
  USING ((get_my_role() = 'parent'::text) AND is_my_student(student_id))
  WITH CHECK ((get_my_role() = 'parent'::text) AND is_my_student(student_id));