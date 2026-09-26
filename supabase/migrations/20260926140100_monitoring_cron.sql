-- Schedule the monitoring functions. The secret is read from Vault
-- ('cron_secret', same value as the CRON_SECRET Edge secret) at run time, so it
-- never appears in cron.job, migrations or git.
--   hourly-monitor: every hour at :05, header x-cron-secret
--   dns-monitor:    every 15 minutes, header Authorization: Bearer <secret>

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'hourly-monitor-job') THEN
    PERFORM cron.unschedule('hourly-monitor-job');
  END IF;
  PERFORM cron.schedule('hourly-monitor-job', '5 * * * *', $cmd$
  select net.http_post(
    url := 'https://gyvjcwuwfwrwwwnuwlex.supabase.co/functions/v1/hourly-monitor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $cmd$);

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dns-monitor-job') THEN
    PERFORM cron.unschedule('dns-monitor-job');
  END IF;
  PERFORM cron.schedule('dns-monitor-job', '*/15 * * * *', $cmd$
  select net.http_post(
    url := 'https://gyvjcwuwfwrwwwnuwlex.supabase.co/functions/v1/dns-monitor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $cmd$);
END $$;

-- Rollback: select cron.unschedule('hourly-monitor-job'); select cron.unschedule('dns-monitor-job');
