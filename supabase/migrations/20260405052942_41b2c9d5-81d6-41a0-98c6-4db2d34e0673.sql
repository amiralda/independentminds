
-- Platform errors table
CREATE TABLE public.platform_errors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  user_role text NOT NULL DEFAULT 'parent',
  is_beta_tester boolean NOT NULL DEFAULT false,
  error_message text NOT NULL,
  error_stack text,
  page_path text,
  browser text,
  device_type text,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_reads_all_platform_errors"
  ON public.platform_errors FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "users_insert_own_errors"
  ON public.platform_errors FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_updates_platform_errors"
  ON public.platform_errors FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "no_delete_platform_errors"
  ON public.platform_errors FOR DELETE
  TO authenticated
  USING (false);

CREATE INDEX idx_platform_errors_created ON public.platform_errors (created_at DESC);
CREATE INDEX idx_platform_errors_page ON public.platform_errors (page_path);

-- User feedback table
CREATE TABLE public.user_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  user_role text NOT NULL DEFAULT 'parent',
  is_beta_tester boolean NOT NULL DEFAULT false,
  feedback_type text NOT NULL,
  rating integer,
  message text,
  category text,
  page_path text,
  screenshot_url text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_reads_all_user_feedback"
  ON public.user_feedback FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "users_insert_own_feedback"
  ON public.user_feedback FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_updates_user_feedback"
  ON public.user_feedback FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "no_delete_user_feedback"
  ON public.user_feedback FOR DELETE
  TO authenticated
  USING (false);

CREATE INDEX idx_user_feedback_created ON public.user_feedback (created_at DESC);
CREATE INDEX idx_user_feedback_type ON public.user_feedback (feedback_type);
