
-- Fix: Recreate ALL RLS policies as PERMISSIVE (PostgreSQL default)
-- Currently all 34 policies are RESTRICTIVE, which blocks all access.

-- achievements
DROP POLICY IF EXISTS "achievements_select" ON public.achievements;
DROP POLICY IF EXISTS "achievements_insert" ON public.achievements;
DROP POLICY IF EXISTS "achievements_update" ON public.achievements;
DROP POLICY IF EXISTS "achievements_delete" ON public.achievements;
CREATE POLICY "achievements_select" ON public.achievements FOR SELECT TO authenticated USING (is_my_student(student_id));
CREATE POLICY "achievements_insert" ON public.achievements FOR INSERT TO authenticated WITH CHECK ((get_my_role() = 'parent') AND is_my_student(student_id));
CREATE POLICY "achievements_update" ON public.achievements FOR UPDATE TO authenticated USING ((get_my_role() = 'parent') AND is_my_student(student_id)) WITH CHECK ((get_my_role() = 'parent') AND is_my_student(student_id));
CREATE POLICY "achievements_delete" ON public.achievements FOR DELETE TO authenticated USING ((get_my_role() = 'parent') AND is_my_student(student_id));

-- activity_logs
DROP POLICY IF EXISTS "activity_logs_select" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_update" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_delete" ON public.activity_logs;
CREATE POLICY "activity_logs_select" ON public.activity_logs FOR SELECT TO authenticated USING (is_my_student(student_id));
CREATE POLICY "activity_logs_insert" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (is_my_student(student_id));
CREATE POLICY "activity_logs_update" ON public.activity_logs FOR UPDATE TO authenticated USING (is_my_student(student_id));
CREATE POLICY "activity_logs_delete" ON public.activity_logs FOR DELETE TO authenticated USING (is_my_student(student_id));

-- check_ins
DROP POLICY IF EXISTS "check_ins_select" ON public.check_ins;
DROP POLICY IF EXISTS "check_ins_insert" ON public.check_ins;
DROP POLICY IF EXISTS "check_ins_update" ON public.check_ins;
DROP POLICY IF EXISTS "check_ins_delete" ON public.check_ins;
CREATE POLICY "check_ins_select" ON public.check_ins FOR SELECT TO authenticated USING (is_my_student(student_id));
CREATE POLICY "check_ins_insert" ON public.check_ins FOR INSERT TO authenticated WITH CHECK (is_my_student(student_id));
CREATE POLICY "check_ins_update" ON public.check_ins FOR UPDATE TO authenticated USING (is_my_student(student_id));
CREATE POLICY "check_ins_delete" ON public.check_ins FOR DELETE TO authenticated USING (is_my_student(student_id));

-- curriculum_map
DROP POLICY IF EXISTS "curriculum_map_select" ON public.curriculum_map;
DROP POLICY IF EXISTS "curriculum_map_insert" ON public.curriculum_map;
DROP POLICY IF EXISTS "curriculum_map_update" ON public.curriculum_map;
DROP POLICY IF EXISTS "curriculum_map_delete" ON public.curriculum_map;
CREATE POLICY "curriculum_map_select" ON public.curriculum_map FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "curriculum_map_insert" ON public.curriculum_map FOR INSERT TO authenticated WITH CHECK ((get_my_role() = 'parent') AND (auth.uid() = user_id));
CREATE POLICY "curriculum_map_update" ON public.curriculum_map FOR UPDATE TO authenticated USING ((get_my_role() = 'parent') AND (auth.uid() = user_id));
CREATE POLICY "curriculum_map_delete" ON public.curriculum_map FOR DELETE TO authenticated USING ((get_my_role() = 'parent') AND (auth.uid() = user_id));

-- daily_plan
DROP POLICY IF EXISTS "daily_plan_select" ON public.daily_plan;
DROP POLICY IF EXISTS "daily_plan_insert" ON public.daily_plan;
DROP POLICY IF EXISTS "daily_plan_update" ON public.daily_plan;
DROP POLICY IF EXISTS "daily_plan_delete" ON public.daily_plan;
CREATE POLICY "daily_plan_select" ON public.daily_plan FOR SELECT TO authenticated USING (is_my_student(student_id));
CREATE POLICY "daily_plan_insert" ON public.daily_plan FOR INSERT TO authenticated WITH CHECK (is_my_student(student_id));
CREATE POLICY "daily_plan_update" ON public.daily_plan FOR UPDATE TO authenticated USING (is_my_student(student_id));
CREATE POLICY "daily_plan_delete" ON public.daily_plan FOR DELETE TO authenticated USING (is_my_student(student_id));

-- messages_log
DROP POLICY IF EXISTS "messages_log_select" ON public.messages_log;
CREATE POLICY "messages_log_select" ON public.messages_log FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- parent_settings
DROP POLICY IF EXISTS "own_settings_all" ON public.parent_settings;
CREATE POLICY "own_settings_all" ON public.parent_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id) AND (role = 'parent') AND (student_id IS NULL));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK ((auth.uid() = id) AND (role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())) AND (NOT (student_id IS DISTINCT FROM (SELECT p.student_id FROM profiles p WHERE p.id = auth.uid()))));

-- students (two SELECT policies must be PERMISSIVE to OR together)
DROP POLICY IF EXISTS "students_select_parent" ON public.students;
DROP POLICY IF EXISTS "students_select_student" ON public.students;
DROP POLICY IF EXISTS "students_insert" ON public.students;
DROP POLICY IF EXISTS "students_update" ON public.students;
DROP POLICY IF EXISTS "students_delete" ON public.students;
CREATE POLICY "students_select_parent" ON public.students FOR SELECT TO authenticated USING ((get_my_role() = 'parent') AND (auth.uid() = parent_id));
CREATE POLICY "students_select_student" ON public.students FOR SELECT TO authenticated USING ((get_my_role() = 'student') AND ((SELECT profiles.student_id FROM profiles WHERE profiles.id = auth.uid()) = student_id));
CREATE POLICY "students_insert" ON public.students FOR INSERT TO authenticated WITH CHECK ((get_my_role() = 'parent') AND (auth.uid() = parent_id));
CREATE POLICY "students_update" ON public.students FOR UPDATE TO authenticated USING (auth.uid() = parent_id) WITH CHECK ((auth.uid() = parent_id) AND (NOT (student_id IS DISTINCT FROM (SELECT s.student_id FROM students s WHERE s.ctid = students.ctid))));
CREATE POLICY "students_delete" ON public.students FOR DELETE TO authenticated USING (auth.uid() = parent_id);

-- subject_tracks
DROP POLICY IF EXISTS "subject_tracks_select" ON public.subject_tracks;
DROP POLICY IF EXISTS "subject_tracks_insert" ON public.subject_tracks;
DROP POLICY IF EXISTS "subject_tracks_update" ON public.subject_tracks;
DROP POLICY IF EXISTS "subject_tracks_delete" ON public.subject_tracks;
CREATE POLICY "subject_tracks_select" ON public.subject_tracks FOR SELECT TO authenticated USING (is_my_student(student_id));
CREATE POLICY "subject_tracks_insert" ON public.subject_tracks FOR INSERT TO authenticated WITH CHECK (is_my_student(student_id));
CREATE POLICY "subject_tracks_update" ON public.subject_tracks FOR UPDATE TO authenticated USING (is_my_student(student_id));
CREATE POLICY "subject_tracks_delete" ON public.subject_tracks FOR DELETE TO authenticated USING (is_my_student(student_id));
