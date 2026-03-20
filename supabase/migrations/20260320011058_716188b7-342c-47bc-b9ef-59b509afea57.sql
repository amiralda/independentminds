
-- Create a security definer function for awarding points (bypasses RLS)
CREATE OR REPLACE FUNCTION public.award_points(
  _student_id text,
  _points integer,
  _reason text,
  _source text DEFAULT 'system',
  _reference_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller owns this student
  IF NOT public.is_my_student(_student_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO public.reward_points (student_id, points, reason, source, reference_id)
  VALUES (_student_id, _points, _reason, _source, _reference_id);
END;
$$;

-- Similarly for redemptions, ensure students can redeem via a function
CREATE OR REPLACE FUNCTION public.redeem_reward(
  _student_id text,
  _reward_id uuid,
  _points_spent integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_my_student(_student_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Verify sufficient balance
  IF (SELECT COALESCE(SUM(points), 0) FROM public.reward_points WHERE student_id = _student_id) < _points_spent THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;

  -- Deduct points
  INSERT INTO public.reward_points (student_id, points, reason, source, reference_id)
  VALUES (_student_id, -_points_spent, 'Reward redeemed', 'redemption', _reward_id);

  -- Create redemption record
  INSERT INTO public.reward_redemptions (student_id, reward_id, points_spent, status)
  VALUES (_student_id, _reward_id, _points_spent, 'pending');
END;
$$;
