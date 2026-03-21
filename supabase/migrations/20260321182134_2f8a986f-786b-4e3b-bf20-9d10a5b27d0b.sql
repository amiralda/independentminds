-- Fix WARN: Explicit block policies for reward_points and reward_redemptions
-- reward_points: explicitly block UPDATE and DELETE
CREATE POLICY "reward_points_no_update" ON public.reward_points
  FOR UPDATE TO public USING (false);

CREATE POLICY "reward_points_no_delete" ON public.reward_points
  FOR DELETE TO public USING (false);

-- reward_redemptions: explicitly block DELETE
CREATE POLICY "reward_redemptions_no_delete" ON public.reward_redemptions
  FOR DELETE TO public USING (false);