-- Fix 2: Restrict achievements DELETE to parents only
DROP POLICY IF EXISTS "achievements_delete" ON public.achievements;
CREATE POLICY "achievements_delete" ON public.achievements
  FOR DELETE TO authenticated
  USING ((get_my_role() = 'parent') AND is_my_student(student_id));