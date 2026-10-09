-- Weekly newsletter cron: every Saturday at 19:00 UTC, call
-- send-newsletter-campaign in 'scheduled' mode. The function sends ONLY the
-- campaign whose scheduled_for is today's date in America/New_York and whose
-- every language version is 'approved'; otherwise it returns 200 with a
-- reason and writes/sends nothing (fail closed). A Saturday with nothing
-- approved and scheduled sends nothing.
--
-- LOCAL TIME CHANGES WITH THE SEASON: pg_cron runs in UTC, so 19:00 UTC is
-- 15:00 in New York / Haiti during daylight time (EDT, 2nd Sunday of March to
-- 1st Sunday of November) and 14:00 the rest of the year (EST). Keeping a
-- fixed local time would need two schedules or a cron change at each switch —
-- a decision Dany has NOT taken yet.
--
-- The secret is read from Vault ('cron_secret', same value as the CRON_SECRET
-- Edge secret) at run time, like the other cron jobs, so it never appears in
-- cron.job, migrations or git. timeout_milliseconds is raised from pg_net's
-- 5 s default because the send paces Resend at ~0.6 s per recipient.
--
-- Requires send-newsletter-campaign deployed with the scheduled path and
-- verify_jwt = false (the cron sends no JWT; the function checks the admin JWT
-- itself on the manual path and the cron secret on this one).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'newsletter-weekly-job') THEN
    PERFORM cron.unschedule('newsletter-weekly-job');
  END IF;
  PERFORM cron.schedule('newsletter-weekly-job', '0 19 * * 6', $cmd$
  select net.http_post(
    url := 'https://gyvjcwuwfwrwwwnuwlex.supabase.co/functions/v1/send-newsletter-campaign',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  ) as request_id;
  $cmd$);
END $$;

-- ============================================================
-- UNDO
-- ============================================================
-- select cron.unschedule('newsletter-weekly-job');
