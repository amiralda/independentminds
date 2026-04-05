CREATE TABLE public.admin_sent_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  channels text[] NOT NULL DEFAULT '{}',
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  recipient_count integer NOT NULL DEFAULT 0,
  scheduled_for timestamptz,
  sent_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'sent',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_sent_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_sent_notifications"
ON public.admin_sent_notifications
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));