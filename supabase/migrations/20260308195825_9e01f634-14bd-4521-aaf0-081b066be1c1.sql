
-- Add parent_id to students for multi-tenant isolation
ALTER TABLE public.students ADD COLUMN parent_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add language_pref and onboarding_complete to profiles
ALTER TABLE public.profiles ADD COLUMN language_pref text NOT NULL DEFAULT 'EN';
ALTER TABLE public.profiles ADD COLUMN onboarding_complete boolean NOT NULL DEFAULT false;

-- Create parent_settings for per-parent telegram config
CREATE TABLE public.parent_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  telegram_bot_token text,
  telegram_chat_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.parent_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_settings_all" ON public.parent_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_parent_settings_updated_at
  BEFORE UPDATE ON public.parent_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create is_my_student function for multi-tenant RLS
CREATE OR REPLACE FUNCTION public.is_my_student(_student_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students
    WHERE student_id = _student_id AND parent_id = auth.uid()
  )
  OR
  (SELECT student_id FROM public.profiles WHERE id = auth.uid()) = _student_id
$$;

-- Update students RLS for multi-tenant
DROP POLICY IF EXISTS "students_select" ON public.students;
DROP POLICY IF EXISTS "students_insert" ON public.students;
DROP POLICY IF EXISTS "students_update" ON public.students;
DROP POLICY IF EXISTS "students_delete" ON public.students;
CREATE POLICY "students_select" ON public.students FOR SELECT USING (public.is_my_student(student_id));
CREATE POLICY "students_insert" ON public.students FOR INSERT WITH CHECK (auth.uid() = parent_id);
CREATE POLICY "students_update" ON public.students FOR UPDATE USING (public.is_my_student(student_id));
CREATE POLICY "students_delete" ON public.students FOR DELETE USING (auth.uid() = parent_id);

-- Update subject_tracks RLS
DROP POLICY IF EXISTS "subject_tracks_select" ON public.subject_tracks;
DROP POLICY IF EXISTS "subject_tracks_insert" ON public.subject_tracks;
DROP POLICY IF EXISTS "subject_tracks_update" ON public.subject_tracks;
DROP POLICY IF EXISTS "subject_tracks_delete" ON public.subject_tracks;
CREATE POLICY "subject_tracks_select" ON public.subject_tracks FOR SELECT USING (public.is_my_student(student_id));
CREATE POLICY "subject_tracks_insert" ON public.subject_tracks FOR INSERT WITH CHECK (public.is_my_student(student_id));
CREATE POLICY "subject_tracks_update" ON public.subject_tracks FOR UPDATE USING (public.is_my_student(student_id));
CREATE POLICY "subject_tracks_delete" ON public.subject_tracks FOR DELETE USING (public.is_my_student(student_id));

-- Update activity_logs RLS
DROP POLICY IF EXISTS "activity_logs_select" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_update" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_delete" ON public.activity_logs;
CREATE POLICY "activity_logs_select" ON public.activity_logs FOR SELECT USING (public.is_my_student(student_id));
CREATE POLICY "activity_logs_insert" ON public.activity_logs FOR INSERT WITH CHECK (public.is_my_student(student_id));
CREATE POLICY "activity_logs_update" ON public.activity_logs FOR UPDATE USING (public.is_my_student(student_id));
CREATE POLICY "activity_logs_delete" ON public.activity_logs FOR DELETE USING (public.is_my_student(student_id));

-- Update achievements RLS
DROP POLICY IF EXISTS "achievements_select" ON public.achievements;
DROP POLICY IF EXISTS "achievements_insert" ON public.achievements;
DROP POLICY IF EXISTS "achievements_delete" ON public.achievements;
CREATE POLICY "achievements_select" ON public.achievements FOR SELECT USING (public.is_my_student(student_id));
CREATE POLICY "achievements_insert" ON public.achievements FOR INSERT WITH CHECK (public.is_my_student(student_id));
CREATE POLICY "achievements_delete" ON public.achievements FOR DELETE USING (public.is_my_student(student_id));

-- Update check_ins RLS
DROP POLICY IF EXISTS "check_ins_select" ON public.check_ins;
DROP POLICY IF EXISTS "check_ins_insert" ON public.check_ins;
DROP POLICY IF EXISTS "check_ins_update" ON public.check_ins;
CREATE POLICY "check_ins_select" ON public.check_ins FOR SELECT USING (public.is_my_student(student_id));
CREATE POLICY "check_ins_insert" ON public.check_ins FOR INSERT WITH CHECK (public.is_my_student(student_id));
CREATE POLICY "check_ins_update" ON public.check_ins FOR UPDATE USING (public.is_my_student(student_id));

-- Update daily_plan RLS
DROP POLICY IF EXISTS "daily_plan_select" ON public.daily_plan;
DROP POLICY IF EXISTS "daily_plan_insert" ON public.daily_plan;
DROP POLICY IF EXISTS "daily_plan_update" ON public.daily_plan;
DROP POLICY IF EXISTS "daily_plan_delete" ON public.daily_plan;
CREATE POLICY "daily_plan_select" ON public.daily_plan FOR SELECT USING (public.is_my_student(student_id));
CREATE POLICY "daily_plan_insert" ON public.daily_plan FOR INSERT WITH CHECK (public.is_my_student(student_id));
CREATE POLICY "daily_plan_update" ON public.daily_plan FOR UPDATE USING (public.is_my_student(student_id));
CREATE POLICY "daily_plan_delete" ON public.daily_plan FOR DELETE USING (public.is_my_student(student_id));
