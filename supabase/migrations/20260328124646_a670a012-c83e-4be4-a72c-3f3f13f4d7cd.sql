-- 1. Restrict daily_plan INSERT to parent role only
DROP POLICY "daily_plan_insert" ON public.daily_plan;
CREATE POLICY "daily_plan_insert" ON public.daily_plan
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() = 'parent'
    AND is_my_student(student_id)
  );

-- 2. Restrict daily_plan UPDATE: parents can update anything, students only allowed fields
DROP POLICY "daily_plan_update" ON public.daily_plan;
CREATE POLICY "daily_plan_update" ON public.daily_plan
  FOR UPDATE TO authenticated
  USING (is_my_student(student_id))
  WITH CHECK (is_my_student(student_id));

-- 3. Trigger to block students from changing schedule-defining columns
CREATE OR REPLACE FUNCTION public.guard_daily_plan_student_update()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  -- Parents can change anything
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'parent' THEN
    RETURN NEW;
  END IF;

  -- Students: block changes to schedule-defining columns
  IF NEW.subject    IS DISTINCT FROM OLD.subject
  OR NEW.start_time IS DISTINCT FROM OLD.start_time
  OR NEW.end_time   IS DISTINCT FROM OLD.end_time
  OR NEW.plan_date  IS DISTINCT FROM OLD.plan_date
  OR NEW.block_order IS DISTINCT FROM OLD.block_order
  OR NEW.map_id     IS DISTINCT FROM OLD.map_id
  OR NEW.student_id IS DISTINCT FROM OLD.student_id
  THEN
    RAISE EXCEPTION 'Students cannot modify schedule structure';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_daily_plan_student_update
  BEFORE UPDATE ON public.daily_plan
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_daily_plan_student_update();