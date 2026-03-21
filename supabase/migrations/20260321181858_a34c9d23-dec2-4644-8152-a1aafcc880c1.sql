-- Account merge requests table
CREATE TABLE public.merge_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  source_email text NOT NULL,
  target_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reason text,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.merge_requests ENABLE ROW LEVEL SECURITY;

-- Parents can see their own merge requests
CREATE POLICY "merge_requests_select" ON public.merge_requests
  FOR SELECT TO authenticated
  USING (requester_id = auth.uid());

-- Parents can insert their own merge requests
CREATE POLICY "merge_requests_insert" ON public.merge_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    requester_id = auth.uid()
    AND get_my_role() = 'parent'
  );

-- No client update/delete — admin only via service role
CREATE POLICY "merge_requests_no_update" ON public.merge_requests
  FOR UPDATE TO public
  USING (false);

CREATE POLICY "merge_requests_no_delete" ON public.merge_requests
  FOR DELETE TO public
  USING (false);