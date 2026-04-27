-- ============================================================
-- 1. Make student-photos bucket PRIVATE
-- ============================================================
UPDATE storage.buckets SET public = false WHERE id = 'student-photos';

-- Drop the overly-permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view student photos" ON storage.objects;

-- Add an authenticated SELECT policy: only the owning parent, the student themselves,
-- co-guardians, educators, or admins can read each photo.
-- Photos live under {student_id}/... so we use foldername(name)[1] as the student_id.
CREATE POLICY "authorized_users_read_student_photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'student-photos'
  AND (
    public.is_my_student((storage.foldername(name))[1])
    OR public.is_my_educator_student((storage.foldername(name))[1])
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.co_guardians cg
      WHERE cg.guardian_id = auth.uid()
        AND cg.student_id = (storage.foldername(name))[1]
    )
  )
);

-- ============================================================
-- 2. Realtime channel authorization for inbox_messages
-- ============================================================
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Only allow authenticated users to receive realtime broadcasts when their topic
-- matches their own user_id (parents subscribe to channels keyed by their auth uid).
DROP POLICY IF EXISTS "authenticated_can_receive_own_topic" ON realtime.messages;
CREATE POLICY "authenticated_can_receive_own_topic"
ON realtime.messages FOR SELECT
TO authenticated
USING (
  -- Topic must contain the user's auth id, OR the user is admin
  (realtime.topic() ILIKE '%' || auth.uid()::text || '%')
  OR public.has_role(auth.uid(), 'admin')
);

-- ============================================================
-- 3. Restricted educator-facing student summary
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_educator_student_summary(_student_id text)
RETURNS TABLE(
  student_id text,
  display_name text,
  grade_level integer,
  language_pref text,
  timezone text,
  profile_photo_url text,
  monitoring_enabled boolean,
  academic_year text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    s.student_id,
    s.display_name,
    s.grade_level,
    s.language_pref,
    s.timezone,
    s.profile_photo_url,
    s.monitoring_enabled,
    s.academic_year,
    s.created_at,
    s.updated_at
  FROM public.students s
  WHERE s.student_id = _student_id
    AND public.is_my_educator_student(_student_id);
$$;

REVOKE EXECUTE ON FUNCTION public.get_educator_student_summary(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_educator_student_summary(text) TO authenticated;