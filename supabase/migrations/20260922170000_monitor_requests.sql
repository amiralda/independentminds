-- "Request Monitor Access" feature: a user submits a request, an admin
-- approves/rejects it via the review-monitor-request edge function, which
-- grants the 'monitor' role additively on approval (same mechanism as a
-- manual admin grant).
CREATE TABLE public.monitor_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_name text,
  reason text,
  expected_families_count int,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.monitor_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own monitor_requests" ON public.monitor_requests
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user creates own monitor_requests" ON public.monitor_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());
-- No user UPDATE/DELETE policy: a submitted request can't be self-edited or
-- self-approved: only the review-monitor-request edge function (service
-- role) or an admin can change its status.
CREATE POLICY "admin manages monitor_requests" ON public.monitor_requests
  FOR ALL USING (has_role(auth.uid(), 'admin'::text)) WITH CHECK (has_role(auth.uid(), 'admin'::text));
CREATE POLICY "service role manages monitor_requests" ON public.monitor_requests
  FOR ALL TO service_role USING (true) WITH CHECK (true);
