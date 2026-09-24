-- Rewards: points for completed tasks + automatic badges.
-- Additive only: new columns (with defaults), indexes, functions, triggers.
-- Points and badges are written server-side only (SECURITY DEFINER);
-- no client INSERT policy is added to reward_points or achievements.

-- 1) Columns / indexes -----------------------------------------------------
ALTER TABLE public.reward_points
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS reference_id uuid;
-- One award per (student, source, referenced row): re-marking a task done
-- never pays twice.
CREATE UNIQUE INDEX IF NOT EXISTS reward_points_once_per_reference
  ON public.reward_points (student_id, source, reference_id)
  WHERE reference_id IS NOT NULL;

-- Family-wide points per completed task. No row = default 10.
-- Existing policy "parent manages own settings" (auth.uid() = id) keeps it parent-only.
ALTER TABLE public.parent_settings
  ADD COLUMN IF NOT EXISTS points_per_task integer NOT NULL DEFAULT 10
  CONSTRAINT parent_settings_points_per_task_range CHECK (points_per_task BETWEEN 0 AND 1000);

-- Each badge once per student.
CREATE UNIQUE INDEX IF NOT EXISTS achievements_one_per_badge
  ON public.achievements (student_id, badge_type);

-- 2) Task done -> points ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_task_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_points integer;
BEGIN
  IF NEW.status = 'done' AND OLD.status IS DISTINCT FROM 'done' AND NEW.student_id IS NOT NULL THEN
    SELECT ps.points_per_task INTO v_points
      FROM public.students s
      LEFT JOIN public.parent_settings ps ON ps.id = s.parent_id
     WHERE s.id = NEW.student_id;
    v_points := COALESCE(v_points, 10);
    IF v_points > 0 THEN
      INSERT INTO public.reward_points (student_id, points, reason, source, reference_id)
      VALUES (NEW.student_id, v_points, 'Task done: ' || NEW.subject, 'task_done', NEW.id)
      ON CONFLICT (student_id, source, reference_id) WHERE reference_id IS NOT NULL DO NOTHING;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS award_task_points ON public.daily_plan;
CREATE TRIGGER award_task_points
  AFTER UPDATE OF status ON public.daily_plan
  FOR EACH ROW EXECUTE FUNCTION public.award_task_points();

-- 3) Points -> badges (lifetime earned, so spending never removes one) -----
CREATE OR REPLACE FUNCTION public.award_point_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total integer;
BEGIN
  IF NEW.student_id IS NULL OR NEW.points <= 0 THEN
    RETURN NULL;
  END IF;
  SELECT COALESCE(SUM(points), 0) INTO v_total
    FROM public.reward_points
   WHERE student_id = NEW.student_id AND points > 0;
  INSERT INTO public.achievements (student_id, badge_type, milestone)
  SELECT NEW.student_id, 'points_' || t, t
    FROM unnest(ARRAY[50, 150, 400, 1000]) AS t
   WHERE v_total >= t
  ON CONFLICT (student_id, badge_type) DO NOTHING;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS award_point_badges ON public.reward_points;
CREATE TRIGGER award_point_badges
  AFTER INSERT ON public.reward_points
  FOR EACH ROW EXECUTE FUNCTION public.award_point_badges();

-- 4) Check-ins -> "Fidèl" (7 consecutive days, America/New_York = Haiti time)
-- Client inserts can't backdate a check-in (that would fake a streak).
CREATE OR REPLACE FUNCTION public.stamp_check_in_time()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.checked_in_at := now();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS stamp_check_in_time ON public.check_ins;
CREATE TRIGGER stamp_check_in_time
  BEFORE INSERT ON public.check_ins
  FOR EACH ROW EXECUTE FUNCTION public.stamp_check_in_time();

CREATE OR REPLACE FUNCTION public.award_checkin_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_day date;
  v_days integer;
BEGIN
  IF NEW.student_id IS NULL THEN
    RETURN NULL;
  END IF;
  v_day := (COALESCE(NEW.checked_in_at, now()) AT TIME ZONE 'America/New_York')::date;
  SELECT count(DISTINCT (checked_in_at AT TIME ZONE 'America/New_York')::date) INTO v_days
    FROM public.check_ins
   WHERE student_id = NEW.student_id
     AND (checked_in_at AT TIME ZONE 'America/New_York')::date BETWEEN v_day - 6 AND v_day;
  IF v_days >= 7 THEN
    INSERT INTO public.achievements (student_id, badge_type, milestone)
    VALUES (NEW.student_id, 'checkin_streak_7', 7)
    ON CONFLICT (student_id, badge_type) DO NOTHING;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS award_checkin_badges ON public.check_ins;
CREATE TRIGGER award_checkin_badges
  AFTER INSERT ON public.check_ins
  FOR EACH ROW EXECUTE FUNCTION public.award_checkin_badges();

-- 5) award_points(): the RPC the client already calls, now real but
-- family-only (parent / Manager / co-guardian). Students and admins: 42501.
CREATE OR REPLACE FUNCTION public.award_points(
  _student_id uuid,
  _points integer,
  _reason text DEFAULT NULL,
  _source text DEFAULT 'manual',
  _reference_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_impersonate_student(_student_id) THEN
    RAISE EXCEPTION 'Not allowed to award points to this student' USING ERRCODE = '42501';
  END IF;
  IF _points IS NULL OR _points = 0 OR _points NOT BETWEEN -1000 AND 1000 THEN
    RAISE EXCEPTION 'Points must be between -1000 and 1000 and not 0' USING ERRCODE = '22023';
  END IF;
  IF _source = 'task_done' THEN
    RAISE EXCEPTION 'task_done points are awarded automatically' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.reward_points (student_id, points, reason, source, reference_id)
  VALUES (_student_id, _points, _reason, COALESCE(_source, 'manual'), _reference_id)
  ON CONFLICT (student_id, source, reference_id) WHERE reference_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.award_points(uuid, integer, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_points(uuid, integer, text, text, uuid) TO authenticated, service_role;

-- 6) Admin summary: totals + badge keys only (no raw per-student rows) ------
CREATE OR REPLACE FUNCTION public.get_student_rewards_summary()
RETURNS TABLE (student_id uuid, total_points integer, badges text[])
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT s.id,
         COALESCE((SELECT SUM(rp.points) FROM public.reward_points rp
                    WHERE rp.student_id = s.id AND rp.points > 0), 0)::integer,
         COALESCE((SELECT array_agg(a.badge_type ORDER BY a.earned_at) FROM public.achievements a
                    WHERE a.student_id = s.id), '{}'::text[])
    FROM public.students s;
END;
$$;
REVOKE ALL ON FUNCTION public.get_student_rewards_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_rewards_summary() TO authenticated, service_role;

-- Rollback (reverse order):
--   DROP FUNCTION public.get_student_rewards_summary();
--   DROP FUNCTION public.award_points(uuid, integer, text, text, uuid);
--   DROP TRIGGER award_checkin_badges ON public.check_ins; DROP FUNCTION public.award_checkin_badges();
--   DROP TRIGGER stamp_check_in_time ON public.check_ins; DROP FUNCTION public.stamp_check_in_time();
--   DROP TRIGGER award_point_badges ON public.reward_points; DROP FUNCTION public.award_point_badges();
--   DROP TRIGGER award_task_points ON public.daily_plan; DROP FUNCTION public.award_task_points();
--   DROP INDEX public.achievements_one_per_badge;
--   ALTER TABLE public.parent_settings DROP COLUMN points_per_task;
--   DROP INDEX public.reward_points_once_per_reference;
--   ALTER TABLE public.reward_points DROP COLUMN reference_id, DROP COLUMN source;
