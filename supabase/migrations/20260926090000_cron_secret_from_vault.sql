-- CRON_SECRET rotation (2026-09-26). The previous value was committed to the
-- public repo and hardcoded in these 4 cron.job commands. The 4 jobs now read
-- the x-cron-secret header from Supabase Vault at run time, so the value never
-- appears in cron.job, migrations or git again.
--
-- Prerequisite (done out of band, value NOT in this file):
--   select vault.create_secret('<new value>', 'cron_secret', '...');
-- and the same value set as the CRON_SECRET Edge Function secret.
-- To rotate again: update both (vault.update_secret + Edge secret); no SQL
-- change to the jobs is needed.

DO $$
DECLARE
  j record;
BEGIN
  FOR j IN
    SELECT jobid, jobname,
           CASE jobname
             WHEN 'morning-reminder-job' THEN 'morning-reminder'
             WHEN 'checkin-reminder-job' THEN 'checkin-reminder'
             WHEN 'daily-report-job'     THEN 'daily-report'
             WHEN 'weekly-badge-job'     THEN 'weekly-badge'
           END AS fn
    FROM cron.job
    WHERE jobname IN ('morning-reminder-job', 'checkin-reminder-job', 'daily-report-job', 'weekly-badge-job')
  LOOP
    PERFORM cron.alter_job(
      job_id := j.jobid,
      command := format($cmd$
  select net.http_post(
    url := 'https://gyvjcwuwfwrwwwnuwlex.supabase.co/functions/v1/%s',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $cmd$, j.fn)
    );
  END LOOP;
END $$;

-- Rollback: cron.alter_job(<jobid>, command := <previous command with a literal
-- header>) -- see 20260830190500_fix_notification_cron_jobs.sql (value redacted).
