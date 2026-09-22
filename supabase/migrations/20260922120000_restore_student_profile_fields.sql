-- Restore student profile columns lost when the current project
-- (gyvjcwuwfwrwwwnuwlex) was rebuilt without the full pre-2026-08-23
-- migration history — same root cause as the earlier grade_level fix
-- (20260907231327_add_grade_level_to_students). AddStudentFullForm.tsx
-- and StudentProfileCard.tsx already read/write all 9 of these columns;
-- PrivacyPolicy.tsx already documents collecting this data. Column
-- defs mirror the original 20260319222728_e3dd46c5-...sql and
-- 20260305014211_3c3c5888-...sql from the old migration chain.
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS profile_photo_url text,
  ADD COLUMN IF NOT EXISTS enrollment_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS academic_year text DEFAULT '2025-2026',
  ADD COLUMN IF NOT EXISTS parent_name text,
  ADD COLUMN IF NOT EXISTS parent_email text,
  ADD COLUMN IF NOT EXISTS parent_whatsapp text;

-- learning_tools: same table the old migration created (used by
-- LearningToolsHub.tsx), rebuilt for the CURRENT schema rather than
-- copied verbatim — the old migration's RLS relied on is_my_student()/
-- get_my_role(), neither of which exists on this project, and its
-- student_id was the legacy TEXT label. LearningToolsHub.tsx passes the
-- modern students.id uuid, so this matches daily_plan/activity_logs/
-- subject_tracks's current ownership-policy shape exactly.
CREATE TABLE IF NOT EXISTS public.learning_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  icon text NOT NULL DEFAULT 'ExternalLink',
  category text NOT NULL DEFAULT 'Learning',
  description text,
  is_suggested boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parent manages learning_tools" ON public.learning_tools
  FOR ALL
  USING (student_id IN (SELECT id FROM public.students WHERE parent_id = auth.uid()))
  WITH CHECK (student_id IN (SELECT id FROM public.students WHERE parent_id = auth.uid()));

CREATE TRIGGER update_learning_tools_updated_at
  BEFORE UPDATE ON public.learning_tools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- student-photos storage bucket: recreated as PRIVATE, not public like the
-- old migration made it. src/lib/studentPhoto.ts already documents and
-- implements this bucket as private ("The `student-photos` bucket is
-- private, so we must request a short-lived signed URL") and always reads
-- via createSignedUrl — the app code has already moved past the old
-- migration's "Anyone can view student photos" public-read design (that
-- would publicly expose children's photos, a real privacy problem).
-- Recreating it public would reintroduce a privacy bug the code no longer
-- has; policies below scope every operation to the owning parent instead.
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-photos', 'student-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "parent manages own student photos" ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'student-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT student_id FROM public.students WHERE parent_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'student-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT student_id FROM public.students WHERE parent_id = auth.uid()
    )
  );
