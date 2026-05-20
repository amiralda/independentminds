-- 1. Telegram bot token: revoke column-level SELECT from authenticated
REVOKE SELECT (telegram_bot_token) ON public.parent_settings FROM authenticated;
-- Keep INSERT/UPDATE so user can save it during linking
GRANT INSERT (telegram_bot_token), UPDATE (telegram_bot_token) ON public.parent_settings TO authenticated;

-- 2. Realtime topic policy: tighten from substring match to exact prefix
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'realtime' AND tablename = 'messages'
      AND policyname = 'authenticated_can_receive_own_topic'
  ) THEN
    EXECUTE 'DROP POLICY "authenticated_can_receive_own_topic" ON realtime.messages';
  END IF;
END $$;

CREATE POLICY "authenticated_scoped_topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE 'user:' || auth.uid()::text || '%'
  OR realtime.topic() LIKE 'inbox:' || auth.uid()::text || '%'
  OR realtime.topic() IN ('inbox-badge', 'inbox_realtime', 'admin-system-alerts', 'admin-notifs')
);

-- 3. Backups bucket: explicit service-role-only policy
DROP POLICY IF EXISTS "service_role_only_backups" ON storage.objects;
CREATE POLICY "service_role_only_backups"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'backups' AND auth.role() = 'service_role')
WITH CHECK (bucket_id = 'backups' AND auth.role() = 'service_role');

-- 4. Beta recordings: allow testers to read their own files
DROP POLICY IF EXISTS "tester_reads_own_recordings" ON storage.objects;
CREATE POLICY "tester_reads_own_recordings"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'beta-recordings'
  AND EXISTS (
    SELECT 1 FROM public.beta_testers bt
    WHERE bt.user_id = auth.uid()
      AND (storage.foldername(name))[1] = bt.id::text
  )
);

-- 5. Beta invites: add token_hash column for future hashed storage
ALTER TABLE public.beta_invites ADD COLUMN IF NOT EXISTS token_hash text;
CREATE INDEX IF NOT EXISTS idx_beta_invites_token_hash ON public.beta_invites(token_hash);

-- 6. Telegram link tokens: add token_hash column for future hashed storage
ALTER TABLE public.telegram_link_tokens ADD COLUMN IF NOT EXISTS token_hash text;
CREATE INDEX IF NOT EXISTS idx_telegram_link_tokens_token_hash ON public.telegram_link_tokens(token_hash);