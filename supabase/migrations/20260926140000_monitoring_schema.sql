-- Monitoring functions go live (hourly-monitor, beta-track, dns-monitor).
-- Schema the functions already expect but that was missing/too narrow.
-- Additive / widening only.

-- 1) beta-track inserts 'bug_report' (BetaFeedbackWidget) and 'task_completion'
--    events; the CHECK rejected them, which made the whole batched insert fail.
ALTER TABLE public.beta_events DROP CONSTRAINT IF EXISTS beta_events_event_type_check;
ALTER TABLE public.beta_events ADD CONSTRAINT beta_events_event_type_check CHECK (event_type = ANY (ARRAY[
  'page_view', 'feature_click', 'error', 'rage_click', 'task_start', 'task_complete', 'task_abandon',
  'session_start', 'session_end', 'bug_report', 'task_completion'
]));

-- 2) beta-track's task difficulty scoring writes these columns.
ALTER TABLE public.beta_task_completions
  ADD COLUMN IF NOT EXISTS difficulty_score integer,
  ADD COLUMN IF NOT EXISTS time_on_task integer,
  ADD COLUMN IF NOT EXISTS rage_clicks_count integer,
  ADD COLUMN IF NOT EXISTS errors_count integer;

-- 3) dns-monitor state + history (definitions from the never-applied
--    2026-07-07 migrations). Admins read; only the service role writes.
CREATE TABLE IF NOT EXISTS public.dns_monitor_state (
  domain text PRIMARY KEY,
  status text NOT NULL,
  previous_status text,
  a_records text[] NOT NULL DEFAULT '{}',
  txt_records text[] NOT NULL DEFAULT '{}',
  details text,
  last_checked_at timestamptz NOT NULL DEFAULT now(),
  last_changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dns_monitor_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  status text NOT NULL,
  previous_status text,
  status_changed boolean NOT NULL DEFAULT false,
  a_records text[] NOT NULL DEFAULT '{}',
  txt_records text[] NOT NULL DEFAULT '{}',
  ns_status int,
  root_status int,
  details text,
  checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dns_monitor_history_domain_time_idx
  ON public.dns_monitor_history (domain, checked_at DESC);
CREATE INDEX IF NOT EXISTS dns_monitor_history_changes_idx
  ON public.dns_monitor_history (domain, checked_at DESC) WHERE status_changed;

ALTER TABLE public.dns_monitor_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dns_monitor_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dns_monitor_state, public.dns_monitor_history FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.dns_monitor_state, public.dns_monitor_history TO authenticated;
GRANT ALL ON public.dns_monitor_state, public.dns_monitor_history TO service_role;

DROP POLICY IF EXISTS "Admins can view dns monitor state" ON public.dns_monitor_state;
CREATE POLICY "Admins can view dns monitor state" ON public.dns_monitor_state
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can view dns monitor history" ON public.dns_monitor_history;
CREATE POLICY "Admins can view dns monitor history" ON public.dns_monitor_history
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4) Keep 30 days of DNS history (every 15 min x 2 domains ~ 192 rows/day).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dns-monitor-history-retention') THEN
    PERFORM cron.unschedule('dns-monitor-history-retention');
  END IF;
  PERFORM cron.schedule(
    'dns-monitor-history-retention', '15 3 * * *',
    $cmd$ delete from public.dns_monitor_history where checked_at < now() - interval '30 days' $cmd$
  );
END $$;

-- Rollback:
--   select cron.unschedule('dns-monitor-history-retention');
--   DROP TABLE public.dns_monitor_history; DROP TABLE public.dns_monitor_state;
--   ALTER TABLE public.beta_task_completions DROP COLUMN difficulty_score, DROP COLUMN time_on_task,
--     DROP COLUMN rage_clicks_count, DROP COLUMN errors_count;
--   restore beta_events_event_type_check without 'bug_report', 'task_completion'.
