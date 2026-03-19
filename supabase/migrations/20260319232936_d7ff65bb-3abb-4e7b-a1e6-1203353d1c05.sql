CREATE OR REPLACE FUNCTION public.get_points_balance(_student_id TEXT)
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT CASE
    WHEN public.is_my_student(_student_id)
    THEN (SELECT COALESCE(SUM(points), 0)::INTEGER FROM public.reward_points WHERE student_id = _student_id)
    ELSE NULL
  END
$$;