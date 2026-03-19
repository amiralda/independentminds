
-- Points ledger: tracks all point transactions (earn & spend)
CREATE TABLE public.reward_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'system',
  reference_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Parent-defined reward catalog
CREATE TABLE public.rewards_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  point_cost INTEGER NOT NULL DEFAULT 50,
  icon TEXT NOT NULL DEFAULT '🎁',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Redemption log
CREATE TABLE public.reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  reward_id UUID NOT NULL REFERENCES public.rewards_catalog(id) ON DELETE CASCADE,
  points_spent INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fulfilled_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.reward_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS: reward_points
CREATE POLICY "reward_points_select" ON public.reward_points FOR SELECT TO authenticated USING (is_my_student(student_id));
CREATE POLICY "reward_points_insert" ON public.reward_points FOR INSERT TO authenticated WITH CHECK (is_my_student(student_id));

-- RLS: rewards_catalog
CREATE POLICY "rewards_catalog_select" ON public.rewards_catalog FOR SELECT TO authenticated USING (is_my_student(student_id));
CREATE POLICY "rewards_catalog_insert" ON public.rewards_catalog FOR INSERT TO authenticated WITH CHECK ((get_my_role() = 'parent') AND is_my_student(student_id));
CREATE POLICY "rewards_catalog_update" ON public.rewards_catalog FOR UPDATE TO authenticated USING ((get_my_role() = 'parent') AND is_my_student(student_id));
CREATE POLICY "rewards_catalog_delete" ON public.rewards_catalog FOR DELETE TO authenticated USING ((get_my_role() = 'parent') AND is_my_student(student_id));

-- RLS: reward_redemptions
CREATE POLICY "reward_redemptions_select" ON public.reward_redemptions FOR SELECT TO authenticated USING (is_my_student(student_id));
CREATE POLICY "reward_redemptions_insert" ON public.reward_redemptions FOR INSERT TO authenticated WITH CHECK (is_my_student(student_id));
CREATE POLICY "reward_redemptions_update" ON public.reward_redemptions FOR UPDATE TO authenticated USING ((get_my_role() = 'parent') AND is_my_student(student_id));

-- Updated_at trigger for rewards_catalog
CREATE TRIGGER update_rewards_catalog_updated_at BEFORE UPDATE ON public.rewards_catalog
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Helper function: get total points balance for a student
CREATE OR REPLACE FUNCTION public.get_points_balance(_student_id TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(points), 0)::INTEGER FROM public.reward_points WHERE student_id = _student_id
$$;
