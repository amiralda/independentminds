-- Add user_id column to curriculum_map
ALTER TABLE public.curriculum_map ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill existing rows with the first parent user
UPDATE public.curriculum_map SET user_id = (SELECT id FROM public.profiles WHERE role = 'parent' LIMIT 1) WHERE user_id IS NULL;

-- Make user_id NOT NULL after backfill
ALTER TABLE public.curriculum_map ALTER COLUMN user_id SET NOT NULL;

-- Drop old policies
DROP POLICY IF EXISTS "curriculum_map_insert" ON public.curriculum_map;
DROP POLICY IF EXISTS "curriculum_map_update" ON public.curriculum_map;
DROP POLICY IF EXISTS "curriculum_map_delete" ON public.curriculum_map;
DROP POLICY IF EXISTS "curriculum_map_select" ON public.curriculum_map;

-- Recreate with ownership enforcement
CREATE POLICY "curriculum_map_select" ON public.curriculum_map
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "curriculum_map_insert" ON public.curriculum_map
  FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'parent' AND auth.uid() = user_id);

CREATE POLICY "curriculum_map_update" ON public.curriculum_map
  FOR UPDATE TO authenticated
  USING (get_my_role() = 'parent' AND auth.uid() = user_id);

CREATE POLICY "curriculum_map_delete" ON public.curriculum_map
  FOR DELETE TO authenticated
  USING (get_my_role() = 'parent' AND auth.uid() = user_id);