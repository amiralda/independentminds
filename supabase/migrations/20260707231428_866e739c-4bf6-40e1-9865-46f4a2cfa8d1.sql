
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

GRANT SELECT ON public.dns_monitor_state TO authenticated;
GRANT ALL ON public.dns_monitor_state TO service_role;

ALTER TABLE public.dns_monitor_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view dns monitor state"
  ON public.dns_monitor_state FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
