-- Drop existing overly permissive storage policies for student-photos
DROP POLICY IF EXISTS "Authenticated users can upload student photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update student photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete student photos" ON storage.objects;

-- Create ownership-scoped INSERT policy
-- File path convention: {student_id}/avatar.{ext}
CREATE POLICY "Parents upload own student photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'student-photos'
  AND public.is_my_student((storage.foldername(name))[1])
);

-- Create ownership-scoped UPDATE policy
CREATE POLICY "Parents update own student photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'student-photos'
  AND public.is_my_student((storage.foldername(name))[1])
);

-- Create ownership-scoped DELETE policy
CREATE POLICY "Parents delete own student photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'student-photos'
  AND public.is_my_student((storage.foldername(name))[1])
);