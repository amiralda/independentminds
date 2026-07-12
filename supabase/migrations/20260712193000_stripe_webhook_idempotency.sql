ALTER TABLE public.billing_events
ADD COLUMN IF NOT EXISTS stripe_event_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_events_stripe_event_id
ON public.billing_events (stripe_event_id)
WHERE stripe_event_id IS NOT NULL;