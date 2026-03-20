
-- Fix error: Students can self-award reward points
DROP POLICY IF EXISTS "reward_points_insert" ON public.reward_points;
CREATE POLICY "reward_points_insert" ON public.reward_points
  FOR INSERT TO authenticated
  WITH CHECK ((get_my_role() = 'parent') AND is_my_student(student_id));

-- Fix error: Students can create pre-approved reward redemptions
DROP POLICY IF EXISTS "reward_redemptions_insert" ON public.reward_redemptions;
CREATE POLICY "reward_redemptions_insert" ON public.reward_redemptions
  FOR INSERT TO authenticated
  WITH CHECK (is_my_student(student_id) AND status = 'pending' AND fulfilled_at IS NULL);
