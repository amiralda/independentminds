-- Rewards shop: make the catalog + redemptions match what the app needs, and
-- move redemption server-side. The price always comes from rewards_catalog
-- (never the client), the balance check and the points debit happen in one
-- transaction under a per-student row lock. Additive only.

-- 1) Catalog: emoji icon shown in the shop (existing columns stay the truth:
--    parent_id = family, title, is_active).
ALTER TABLE public.rewards_catalog
  ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT '🎁';

-- 2) Redemptions: snapshot of what was spent and on what, so history stays
--    right if the parent later edits or deletes the reward.
ALTER TABLE public.reward_redemptions
  ADD COLUMN IF NOT EXISTS points_spent integer NOT NULL DEFAULT 0 CHECK (points_spent >= 0),
  ADD COLUMN IF NOT EXISTS reward_title text;

-- 3) Student accounts: read their family's catalog and their own redemptions.
--    (Parents/Managers/co-guardians already covered by the existing policies.)
DROP POLICY IF EXISTS "student reads family rewards_catalog" ON public.rewards_catalog;
CREATE POLICY "student reads family rewards_catalog" ON public.rewards_catalog
  FOR SELECT TO authenticated
  USING (parent_id = (SELECT s.parent_id FROM public.students s WHERE s.id = public.get_my_student_id()));

DROP POLICY IF EXISTS "student reads own reward_redemptions" ON public.reward_redemptions;
CREATE POLICY "student reads own reward_redemptions" ON public.reward_redemptions
  FOR SELECT TO authenticated
  USING (student_id = public.get_my_student_id());

-- 4) redeem_reward(): the only way to redeem. Caller = the student's own
--    account, or anyone who manages the family (parent/Manager/co-guardian).
CREATE OR REPLACE FUNCTION public.redeem_reward(_student_id uuid, _reward_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_student public.students%ROWTYPE;
  v_reward public.rewards_catalog%ROWTYPE;
  v_balance integer;
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  -- Row lock: concurrent redemptions for the same student run one at a time,
  -- so two clicks can't both pass the balance check.
  SELECT * INTO v_student FROM public.students WHERE id = _student_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'student_not_found' USING ERRCODE = 'P0002';
  END IF;
  -- COALESCE: a sibling row has user_id NULL, and NOT (NULL OR false) is NULL,
  -- which IF treats as false -- that would let a student spend a sibling's points.
  IF NOT COALESCE(v_student.user_id = auth.uid()
          OR v_student.parent_id IN (SELECT public.get_managed_parent_ids(auth.uid())), false) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_reward FROM public.rewards_catalog WHERE id = _reward_id;
  IF NOT FOUND OR v_reward.parent_id IS DISTINCT FROM v_student.parent_id OR NOT COALESCE(v_reward.is_active, false) THEN
    RAISE EXCEPTION 'reward_unavailable' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(SUM(points), 0) INTO v_balance FROM public.reward_points WHERE student_id = _student_id;
  IF v_balance < v_reward.point_cost THEN
    RAISE EXCEPTION 'insufficient_points' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.reward_redemptions (student_id, reward_id, status, points_spent, reward_title)
  VALUES (_student_id, _reward_id, 'pending', v_reward.point_cost, v_reward.title)
  RETURNING id INTO v_id;

  IF v_reward.point_cost > 0 THEN
    INSERT INTO public.reward_points (student_id, points, reason, source, reference_id)
    VALUES (_student_id, -v_reward.point_cost, 'Reward: ' || v_reward.title, 'redemption', v_id);
  END IF;

  RETURN jsonb_build_object(
    'redemption_id', v_id,
    'points_spent', v_reward.point_cost,
    'balance', v_balance - v_reward.point_cost
  );
END;
$$;
REVOKE ALL ON FUNCTION public.redeem_reward(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_reward(uuid, uuid) TO authenticated, service_role;

-- Rollback:
--   DROP FUNCTION public.redeem_reward(uuid, uuid);
--   DROP POLICY "student reads own reward_redemptions" ON public.reward_redemptions;
--   DROP POLICY "student reads family rewards_catalog" ON public.rewards_catalog;
--   ALTER TABLE public.reward_redemptions DROP COLUMN reward_title, DROP COLUMN points_spent;
--   ALTER TABLE public.rewards_catalog DROP COLUMN icon;
