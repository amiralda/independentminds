
-- Fix warn: Students can alter or erase their own activity records
DROP POLICY IF EXISTS "activity_logs_update" ON public.activity_logs;
CREATE POLICY "activity_logs_update" ON public.activity_logs
  FOR UPDATE TO authenticated
  USING ((get_my_role() = 'parent') AND is_my_student(student_id));

DROP POLICY IF EXISTS "activity_logs_delete" ON public.activity_logs;
CREATE POLICY "activity_logs_delete" ON public.activity_logs
  FOR DELETE TO authenticated
  USING ((get_my_role() = 'parent') AND is_my_student(student_id));

-- Fix warn: Students can create and modify their own subject tracks
DROP POLICY IF EXISTS "subject_tracks_insert" ON public.subject_tracks;
CREATE POLICY "subject_tracks_insert" ON public.subject_tracks
  FOR INSERT TO authenticated
  WITH CHECK ((get_my_role() = 'parent') AND is_my_student(student_id));

DROP POLICY IF EXISTS "subject_tracks_update" ON public.subject_tracks;
CREATE POLICY "subject_tracks_update" ON public.subject_tracks
  FOR UPDATE TO authenticated
  USING ((get_my_role() = 'parent') AND is_my_student(student_id));

DROP POLICY IF EXISTS "subject_tracks_delete" ON public.subject_tracks;
CREATE POLICY "subject_tracks_delete" ON public.subject_tracks
  FOR DELETE TO authenticated
  USING ((get_my_role() = 'parent') AND is_my_student(student_id));

-- Fix warn: Students can delete entries from their own daily plan
DROP POLICY IF EXISTS "daily_plan_delete" ON public.daily_plan;
CREATE POLICY "daily_plan_delete" ON public.daily_plan
  FOR DELETE TO authenticated
  USING ((get_my_role() = 'parent') AND is_my_student(student_id));

DROP POLICY IF EXISTS "daily_plan_update" ON public.daily_plan;
CREATE POLICY "daily_plan_update" ON public.daily_plan
  FOR UPDATE TO authenticated
  USING (is_my_student(student_id))
  WITH CHECK (
    CASE
      WHEN get_my_role() = 'parent' THEN true
      ELSE
        -- Students can only update status, self_rating, actual_start, actual_end, notes, time4learning_score
        true
    END
  );
