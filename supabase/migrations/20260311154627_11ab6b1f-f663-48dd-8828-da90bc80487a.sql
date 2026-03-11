-- Fix 1: Restrict curriculum_map SELECT to owner only
DROP POLICY IF EXISTS "curriculum_map_select" ON public.curriculum_map;
CREATE POLICY "curriculum_map_select" ON public.curriculum_map
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);