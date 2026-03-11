-- Batch 1: achievements, activity_logs, check_ins

-- achievements
DROP POLICY IF EXISTS "achievements_select" ON public.achievements;
CREATE POLICY "achievements_select" ON public.achievements FOR SELECT TO authenticated USING (is_my_student(student_id));

DROP POLICY IF EXISTS "achievements_insert" ON public.achievements;
CREATE POLICY "achievements_insert" ON public.achievements FOR INSERT TO authenticated WITH CHECK ((get_my_role() = 'parent') AND is_my_student(student_id));

DROP POLICY IF EXISTS "achievements_update" ON public.achievements;
CREATE POLICY "achievements_update" ON public.achievements FOR UPDATE TO authenticated USING ((get_my_role() = 'parent') AND is_my_student(student_id)) WITH CHECK ((get_my_role() = 'parent') AND is_my_student(student_id));

DROP POLICY IF EXISTS "achievements_delete" ON public.achievements;
CREATE POLICY "achievements_delete" ON public.achievements FOR DELETE TO authenticated USING ((get_my_role() = 'parent') AND is_my_student(student_id));

-- activity_logs
DROP POLICY IF EXISTS "activity_logs_select" ON public.activity_logs;
CREATE POLICY "activity_logs_select" ON public.activity_logs FOR SELECT TO authenticated USING (is_my_student(student_id));

DROP POLICY IF EXISTS "activity_logs_insert" ON public.activity_logs;
CREATE POLICY "activity_logs_insert" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (is_my_student(student_id));

DROP POLICY IF EXISTS "activity_logs_update" ON public.activity_logs;
CREATE POLICY "activity_logs_update" ON public.activity_logs FOR UPDATE TO authenticated USING (is_my_student(student_id));

DROP POLICY IF EXISTS "activity_logs_delete" ON public.activity_logs;
CREATE POLICY "activity_logs_delete" ON public.activity_logs FOR DELETE TO authenticated USING (is_my_student(student_id));

-- check_ins
DROP POLICY IF EXISTS "check_ins_select" ON public.check_ins;
CREATE POLICY "check_ins_select" ON public.check_ins FOR SELECT TO authenticated USING (is_my_student(student_id));

DROP POLICY IF EXISTS "check_ins_insert" ON public.check_ins;
CREATE POLICY "check_ins_insert" ON public.check_ins FOR INSERT TO authenticated WITH CHECK (is_my_student(student_id));

DROP POLICY IF EXISTS "check_ins_update" ON public.check_ins;
CREATE POLICY "check_ins_update" ON public.check_ins FOR UPDATE TO authenticated USING (is_my_student(student_id));

DROP POLICY IF EXISTS "check_ins_delete" ON public.check_ins;
CREATE POLICY "check_ins_delete" ON public.check_ins FOR DELETE TO authenticated USING (is_my_student(student_id));