DROP POLICY IF EXISTS "authorized_users_read_student_photos" ON storage.objects;
CREATE POLICY "authorized_users_read_student_photos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'student-photos'
  AND (
    public.is_my_student((storage.foldername(name))[1])
    OR public.is_my_educator_student((storage.foldername(name))[1])
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_guardian_permission(auth.uid(), (storage.foldername(name))[1], 'view_progress')
  )
);