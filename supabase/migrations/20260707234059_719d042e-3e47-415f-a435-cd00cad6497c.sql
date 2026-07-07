
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

GRANT SELECT ON public.dns_monitor_history TO authenticated;
GRANT ALL ON public.dns_monitor_history TO service_role;

ALTER TABLE public.dns_monitor_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view dns monitor history"
  ON public.dns_monitor_history FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
