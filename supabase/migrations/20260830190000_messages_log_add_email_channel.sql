-- Allow 'email' as a valid messages_log.channel value.
-- The 4 parent-notification cron functions (morning-reminder, checkin-reminder,
-- daily-report, weekly-badge) send via Resend email and log to messages_log.
alter table public.messages_log drop constraint messages_log_channel_check;
alter table public.messages_log add constraint messages_log_channel_check
  check (channel = any (array['telegram'::text, 'whatsapp'::text, 'push'::text, 'email'::text]));
