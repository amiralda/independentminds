-- Batch 3: parent_settings, profiles, students, subject_tracks

-- parent_settings
DROP POLICY IF EXISTS "own_settings_all" ON public.parent_settings;
CREATE POLICY "own_settings_all" ON public.parent_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id) AND (role = 'parent') AND (student_id IS NULL));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    (auth.uid() = id)
    AND (role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid()))
    AND (NOT (student_id IS DISTINCT FROM (SELECT p.student_id FROM profiles p WHERE p.id = auth.uid())))
  );

-- students
DROP POLICY IF EXISTS "students_select" ON public.students;
CREATE POLICY "students_select" ON public.students FOR SELECT TO authenticated USING (is_my_student(student_id));

DROP POLICY IF EXISTS "students_insert" ON public.students;
CREATE POLICY "students_insert" ON public.students FOR INSERT TO authenticated WITH CHECK (auth.uid() = parent_id);

DROP POLICY IF EXISTS "students_update" ON public.students;
CREATE POLICY "students_update" ON public.students FOR UPDATE TO authenticated USING (auth.uid() = parent_id) WITH CHECK (auth.uid() = parent_id);

DROP POLICY IF EXISTS "students_delete" ON public.students;
CREATE POLICY "students_delete" ON public.students FOR DELETE TO authenticated USING (auth.uid() = parent_id);

-- subject_tracks
DROP POLICY IF EXISTS "subject_tracks_select" ON public.subject_tracks;
CREATE POLICY "subject_tracks_select" ON public.subject_tracks FOR SELECT TO authenticated USING (is_my_student(student_id));

DROP POLICY IF EXISTS "subject_tracks_insert" ON public.subject_tracks;
CREATE POLICY "subject_tracks_insert" ON public.subject_tracks FOR INSERT TO authenticated WITH CHECK (is_my_student(student_id));

DROP POLICY IF EXISTS "subject_tracks_update" ON public.subject_tracks;
CREATE POLICY "subject_tracks_update" ON public.subject_tracks FOR UPDATE TO authenticated USING (is_my_student(student_id));

DROP POLICY IF EXISTS "subject_tracks_delete" ON public.subject_tracks;
CREATE POLICY "subject_tracks_delete" ON public.subject_tracks FOR DELETE TO authenticated USING (is_my_student(student_id));