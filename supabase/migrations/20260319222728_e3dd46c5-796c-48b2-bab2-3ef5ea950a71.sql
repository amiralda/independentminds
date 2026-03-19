
-- Add profile fields to students table
ALTER TABLE public.students 
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS profile_photo_url text,
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS enrollment_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS academic_year text DEFAULT '2025-2026';

-- Create learning_tools table for parent-managed tool links
CREATE TABLE public.learning_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  name text NOT NULL,
  url text NOT NULL,
  icon text NOT NULL DEFAULT 'ExternalLink',
  category text NOT NULL DEFAULT 'Learning',
  description text,
  is_suggested boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "learning_tools_select" ON public.learning_tools FOR SELECT TO authenticated USING (is_my_student(student_id));
CREATE POLICY "learning_tools_insert" ON public.learning_tools FOR INSERT TO authenticated WITH CHECK ((get_my_role() = 'parent') AND is_my_student(student_id));
CREATE POLICY "learning_tools_update" ON public.learning_tools FOR UPDATE TO authenticated USING ((get_my_role() = 'parent') AND is_my_student(student_id));
CREATE POLICY "learning_tools_delete" ON public.learning_tools FOR DELETE TO authenticated USING ((get_my_role() = 'parent') AND is_my_student(student_id));

-- Create storage bucket for student photos
INSERT INTO storage.buckets (id, name, public) VALUES ('student-photos', 'student-photos', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for student photos
CREATE POLICY "Anyone can view student photos" ON storage.objects FOR SELECT USING (bucket_id = 'student-photos');
CREATE POLICY "Authenticated users can upload student photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'student-photos');
CREATE POLICY "Authenticated users can update student photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'student-photos');
CREATE POLICY "Authenticated users can delete student photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'student-photos');
