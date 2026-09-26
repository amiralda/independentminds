-- admin_notifications: the admin panel (bell, alert count, notification
-- center, beta page) and track-error / hourly-monitor / beta-track all use this
-- table, but it was never created on this project (the 2026-03-22 Lovable
-- migration was not applied) -> 404 in the admin panel.
--
-- New migration instead of re-applying 20260322072436_*.sql: that file also
-- creates an impersonation trigger on impersonation_logs columns that no
-- longer exist (admin view-as was removed on 2026-09-24), has no FK/indexes,
-- and grants UPDATE on every column. Same intent, tightened. Additive.

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title             text NOT NULL CHECK (char_length(title) <= 200),
  body              text NOT NULL CHECK (char_length(body) <= 2000),
  notification_type text NOT NULL,
  is_read           boolean NOT NULL DEFAULT false,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Bell + unread counts, and the writers' 30-60 min dedup lookups.
CREATE INDEX IF NOT EXISTS admin_notifications_admin_unread_idx
  ON public.admin_notifications (admin_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_notifications_admin_type_idx
  ON public.admin_notifications (admin_id, notification_type, created_at DESC);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- An admin sees only their own notifications.
DROP POLICY IF EXISTS "admin reads own notifications" ON public.admin_notifications;
CREATE POLICY "admin reads own notifications" ON public.admin_notifications
  FOR SELECT TO authenticated
  USING (admin_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));

-- ...and can mark them read (the column grant below limits this to is_read).
DROP POLICY IF EXISTS "admin marks own notifications read" ON public.admin_notifications;
CREATE POLICY "admin marks own notifications read" ON public.admin_notifications
  FOR UPDATE TO authenticated
  USING (admin_id = auth.uid() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (admin_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));

-- No INSERT/DELETE for clients: only edge functions (service role) write.
REVOKE ALL ON public.admin_notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_notifications TO authenticated;
GRANT UPDATE (is_read) ON public.admin_notifications TO authenticated;
GRANT ALL ON public.admin_notifications TO service_role;

-- The UI listens for INSERT/UPDATE (Realtime applies the RLS above).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'admin_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
  END IF;
END $$;

-- Rollback:
--   ALTER PUBLICATION supabase_realtime DROP TABLE public.admin_notifications;
--   DROP TABLE public.admin_notifications;
