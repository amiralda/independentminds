
-- FIX 1 & 2: Prevent privilege escalation via profiles UPDATE
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  AND student_id IS NOT DISTINCT FROM (SELECT p.student_id FROM public.profiles p WHERE p.id = auth.uid())
);

-- FIX 3: Convert ALL restrictive policies to permissive
-- ACHIEVEMENTS
DROP POLICY IF EXISTS "achievements_select" ON public.achievements;
CREATE POLICY "achievements_select" ON public.achievements FOR SELECT TO authenticated USING (is_my_student(student_id));
DROP POLICY IF EXISTS "achievements_insert" ON public.achievements;
CREATE POLICY "achievements_insert" ON public.achievements FOR INSERT TO authenticated WITH CHECK (is_my_student(student_id));
DROP POLICY IF EXISTS "achievements_delete" ON public.achievements;
CREATE POLICY "achievements_delete" ON public.achievements FOR DELETE TO authenticated USING (is_my_student(student_id));

-- ACTIVITY_LOGS
DROP POLICY IF EXISTS "activity_logs_select" ON public.activity_logs;
CREATE POLICY "activity_logs_select" ON public.activity_logs FOR SELECT TO authenticated USING (is_my_student(student_id));
DROP POLICY IF EXISTS "activity_logs_insert" ON public.activity_logs;
CREATE POLICY "activity_logs_insert" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (is_my_student(student_id));
DROP POLICY IF EXISTS "activity_logs_update" ON public.activity_logs;
CREATE POLICY "activity_logs_update" ON public.activity_logs FOR UPDATE TO authenticated USING (is_my_student(student_id));
DROP POLICY IF EXISTS "activity_logs_delete" ON public.activity_logs;
CREATE POLICY "activity_logs_delete" ON public.activity_logs FOR DELETE TO authenticated USING (is_my_student(student_id));

-- CHECK_INS
DROP POLICY IF EXISTS "check_ins_select" ON public.check_ins;
CREATE POLICY "check_ins_select" ON public.check_ins FOR SELECT TO authenticated USING (is_my_student(student_id));
DROP POLICY IF EXISTS "check_ins_insert" ON public.check_ins;
CREATE POLICY "check_ins_insert" ON public.check_ins FOR INSERT TO authenticated WITH CHECK (is_my_student(student_id));
DROP POLICY IF EXISTS "check_ins_update" ON public.check_ins;
CREATE POLICY "check_ins_update" ON public.check_ins FOR UPDATE TO authenticated USING (is_my_student(student_id));

-- CURRICULUM_MAP
DROP POLICY IF EXISTS "curriculum_map_select" ON public.curriculum_map;
CREATE POLICY "curriculum_map_select" ON public.curriculum_map FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "curriculum_map_insert" ON public.curriculum_map;
CREATE POLICY "curriculum_map_insert" ON public.curriculum_map FOR INSERT TO authenticated WITH CHECK (get_my_role() = 'parent');
DROP POLICY IF EXISTS "curriculum_map_update" ON public.curriculum_map;
CREATE POLICY "curriculum_map_update" ON public.curriculum_map FOR UPDATE TO authenticated USING (get_my_role() = 'parent');
DROP POLICY IF EXISTS "curriculum_map_delete" ON public.curriculum_map;
CREATE POLICY "curriculum_map_delete" ON public.curriculum_map FOR DELETE TO authenticated USING (get_my_role() = 'parent');

-- DAILY_PLAN
DROP POLICY IF EXISTS "daily_plan_select" ON public.daily_plan;
CREATE POLICY "daily_plan_select" ON public.daily_plan FOR SELECT TO authenticated USING (is_my_student(student_id));
DROP POLICY IF EXISTS "daily_plan_insert" ON public.daily_plan;
CREATE POLICY "daily_plan_insert" ON public.daily_plan FOR INSERT TO authenticated WITH CHECK (is_my_student(student_id));
DROP POLICY IF EXISTS "daily_plan_update" ON public.daily_plan;
CREATE POLICY "daily_plan_update" ON public.daily_plan FOR UPDATE TO authenticated USING (is_my_student(student_id));
DROP POLICY IF EXISTS "daily_plan_delete" ON public.daily_plan;
CREATE POLICY "daily_plan_delete" ON public.daily_plan FOR DELETE TO authenticated USING (is_my_student(student_id));

-- MESSAGES_LOG
DROP POLICY IF EXISTS "messages_log_select" ON public.messages_log;
CREATE POLICY "messages_log_select" ON public.messages_log FOR SELECT TO authenticated USING (get_my_role() = 'parent');
DROP POLICY IF EXISTS "messages_log_insert" ON public.messages_log;
CREATE POLICY "messages_log_insert" ON public.messages_log FOR INSERT TO authenticated WITH CHECK (get_my_role() = 'parent');

-- PARENT_SETTINGS
DROP POLICY IF EXISTS "own_settings_all" ON public.parent_settings;
CREATE POLICY "own_settings_all" ON public.parent_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- STUDENTS
DROP POLICY IF EXISTS "students_select" ON public.students;
CREATE POLICY "students_select" ON public.students FOR SELECT TO authenticated USING (is_my_student(student_id));
DROP POLICY IF EXISTS "students_insert" ON public.students;
CREATE POLICY "students_insert" ON public.students FOR INSERT TO authenticated WITH CHECK (auth.uid() = parent_id);
DROP POLICY IF EXISTS "students_update" ON public.students;
CREATE POLICY "students_update" ON public.students FOR UPDATE TO authenticated USING (is_my_student(student_id));
DROP POLICY IF EXISTS "students_delete" ON public.students;
CREATE POLICY "students_delete" ON public.students FOR DELETE TO authenticated USING (auth.uid() = parent_id);

-- SUBJECT_TRACKS
DROP POLICY IF EXISTS "subject_tracks_select" ON public.subject_tracks;
CREATE POLICY "subject_tracks_select" ON public.subject_tracks FOR SELECT TO authenticated USING (is_my_student(student_id));
DROP POLICY IF EXISTS "subject_tracks_insert" ON public.subject_tracks;
CREATE POLICY "subject_tracks_insert" ON public.subject_tracks FOR INSERT TO authenticated WITH CHECK (is_my_student(student_id));
DROP POLICY IF EXISTS "subject_tracks_update" ON public.subject_tracks;
CREATE POLICY "subject_tracks_update" ON public.subject_tracks FOR UPDATE TO authenticated USING (is_my_student(student_id));
DROP POLICY IF EXISTS "subject_tracks_delete" ON public.subject_tracks;
CREATE POLICY "subject_tracks_delete" ON public.subject_tracks FOR DELETE TO authenticated USING (is_my_student(student_id));
