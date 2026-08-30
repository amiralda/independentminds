-- Reactivates the 4 parent-notification cron jobs, which were broken since
-- creation: pg_net was never installed, and 3 of 4 job URLs contained an
-- unfilled placeholder hostname or a malformed URL.
--
-- CRON_SECRET must also be set as an Edge Function secret (Supabase
-- dashboard/CLI) matching the value embedded in the x-cron-secret header
-- below, or these functions will reject every cron-triggered call with 401.

create extension if not exists pg_net;

select cron.schedule(
  'morning-reminder-job',
  '0 12 * * *', -- 7am America/Port-au-Prince (fixed UTC-5, no DST)
  $$
  select net.http_post(
    url := 'https://gyvjcwuwfwrwwwnuwlex.supabase.co/functions/v1/morning-reminder',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "d418d2e81d6f0c184c0e4126dcb95f04bf50b22e36957aa3"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

select cron.schedule(
  'checkin-reminder-job',
  '0 14 * * *', -- 9am America/Port-au-Prince
  $$
  select net.http_post(
    url := 'https://gyvjcwuwfwrwwwnuwlex.supabase.co/functions/v1/checkin-reminder',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "d418d2e81d6f0c184c0e4126dcb95f04bf50b22e36957aa3"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

select cron.schedule(
  'daily-report-job',
  '0 1 * * *', -- 8pm America/Port-au-Prince (previous calendar day, UTC)
  $$
  select net.http_post(
    url := 'https://gyvjcwuwfwrwwwnuwlex.supabase.co/functions/v1/daily-report',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "d418d2e81d6f0c184c0e4126dcb95f04bf50b22e36957aa3"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

select cron.schedule(
  'weekly-badge-job',
  '0 2 * * 1', -- Sunday 9pm America/Port-au-Prince (Monday 02:00 UTC)
  $$
  select net.http_post(
    url := 'https://gyvjcwuwfwrwwwnuwlex.supabase.co/functions/v1/weekly-badge',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "d418d2e81d6f0c184c0e4126dcb95f04bf50b22e36957aa3"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);
