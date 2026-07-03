
-- Fix 1: Restrict beta screenshot uploads to the tester's own folder
DROP POLICY IF EXISTS tester_upload_screenshots ON storage.objects;
CREATE POLICY tester_upload_screenshots ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'beta-screenshots'
  AND (storage.foldername(name))[1] = (
    SELECT id::text FROM public.beta_testers WHERE user_id = auth.uid() LIMIT 1
  )
);

-- Fix 2: Restrict admin realtime topics to admins only
DROP POLICY IF EXISTS authenticated_scoped_topics ON realtime.messages;
CREATE POLICY authenticated_scoped_topics ON realtime.messages
FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE ('user:' || auth.uid()::text || '%')
  OR realtime.topic() LIKE ('inbox:' || auth.uid()::text || '%')
  OR realtime.topic() = ANY (ARRAY['inbox-badge', 'inbox_realtime'])
  OR (
    realtime.topic() = ANY (ARRAY['admin-system-alerts', 'admin-notifs'])
    AND public.has_role(auth.uid(), 'admin')
  )
);
