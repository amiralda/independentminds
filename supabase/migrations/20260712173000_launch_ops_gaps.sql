CREATE TABLE public.auth_failures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_attempted text,
  failure_type text NOT NULL,
  ip_hint text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.auth_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_reads_all_auth_failures"
  ON public.auth_failures FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "no_update_auth_failures"
  ON public.auth_failures FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "no_delete_auth_failures"
  ON public.auth_failures FOR DELETE
  TO authenticated
  USING (false);

CREATE INDEX idx_auth_failures_created ON public.auth_failures (created_at DESC);
CREATE INDEX idx_auth_failures_failure_type ON public.auth_failures (failure_type);

CREATE TABLE public.billing_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL,
  stripe_object_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_reads_all_billing_events"
  ON public.billing_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "no_update_billing_events"
  ON public.billing_events FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "no_delete_billing_events"
  ON public.billing_events FOR DELETE
  TO authenticated
  USING (false);

CREATE INDEX idx_billing_events_created ON public.billing_events (created_at DESC);
CREATE INDEX idx_billing_events_type ON public.billing_events (type, created_at DESC);