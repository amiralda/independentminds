
-- Beta config singleton
CREATE TABLE public.beta_config (
  id int PRIMARY KEY DEFAULT 1 CHECK(id=1),
  phase text NOT NULL DEFAULT 'closed' CHECK(phase IN('closed','open','disabled')),
  max_testers int DEFAULT 50,
  current_testers int DEFAULT 0,
  beta_start_date timestamptz DEFAULT now(),
  open_beta_date timestamptz,
  updated_at timestamptz DEFAULT now()
);
INSERT INTO public.beta_config(id) VALUES(1);

-- Beta invites
CREATE TABLE public.beta_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  tester_type text NOT NULL CHECK(tester_type IN('parent','student','co_guardian','educator')),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32),'hex'),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','accepted','declined','expired','revoked')),
  invited_by uuid REFERENCES auth.users(id),
  accepted_at timestamptz,
  expires_at timestamptz DEFAULT now() + interval '14 days',
  language text DEFAULT 'en',
  notes text,
  telegram_chat_id text,
  created_at timestamptz DEFAULT now()
);

-- Beta requests (open phase)
CREATE TABLE public.beta_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text NOT NULL,
  tester_type text NOT NULL CHECK(tester_type IN('parent','student','co_guardian','educator')),
  motivation text,
  language text DEFAULT 'en',
  status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','approved','declined')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Beta testers
CREATE TABLE public.beta_testers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tester_type text NOT NULL CHECK(tester_type IN('parent','student','co_guardian','educator')),
  tasks_total int DEFAULT 0,
  tasks_completed int DEFAULT 0,
  tasks_abandoned int DEFAULT 0,
  session_count int DEFAULT 0,
  recording_consent boolean DEFAULT false,
  last_active_at timestamptz,
  beta_phase text DEFAULT 'closed',
  joined_at timestamptz DEFAULT now()
);

-- Beta tasks (seed data)
CREATE TABLE public.beta_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tester_type text NOT NULL,
  task_order int NOT NULL,
  title_key text NOT NULL,
  description_key text NOT NULL,
  feature_area text NOT NULL,
  is_required boolean DEFAULT true
);

-- Beta task completions
CREATE TABLE public.beta_task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tester_id uuid REFERENCES public.beta_testers(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.beta_tasks(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','completed','abandoned','skipped')),
  started_at timestamptz,
  completed_at timestamptz,
  time_spent_seconds int,
  UNIQUE(tester_id, task_id)
);

-- Beta feedback
CREATE TABLE public.beta_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tester_id uuid REFERENCES public.beta_testers(id) ON DELETE CASCADE,
  feedback_type text NOT NULL CHECK(feedback_type IN('widget','survey','bug_report','nps')),
  page_path text,
  feature_area text,
  rating int CHECK(rating BETWEEN 1 AND 5),
  nps_score int CHECK(nps_score BETWEEN 0 AND 10),
  comment text,
  screenshot_url text,
  browser_info jsonb,
  created_at timestamptz DEFAULT now()
);

-- Beta events (behavioral analytics)
CREATE TABLE public.beta_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tester_id uuid REFERENCES public.beta_testers(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK(event_type IN(
    'page_view','feature_click','error','rage_click',
    'task_start','task_complete','task_abandon','session_start','session_end')),
  page_path text,
  feature_name text,
  element_selector text,
  metadata jsonb,
  session_id text,
  duration_ms int,
  created_at timestamptz DEFAULT now()
);

-- Beta sessions
CREATE TABLE public.beta_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tester_id uuid REFERENCES public.beta_testers(id) ON DELETE CASCADE,
  session_id text NOT NULL UNIQUE,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  duration_seconds int,
  page_count int DEFAULT 0,
  event_count int DEFAULT 0,
  recording_url text,
  device_type text CHECK(device_type IN('mobile','tablet','desktop')),
  browser text,
  language text
);

-- Beta invite logs
CREATE TABLE public.beta_invite_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid REFERENCES public.beta_invites(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK(channel IN('email','sms','whatsapp','telegram','copy')),
  status text NOT NULL CHECK(status IN('sent','failed','copied')),
  error_message text,
  sent_at timestamptz DEFAULT now()
);

-- Enable RLS on all 10 tables
ALTER TABLE public.beta_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_testers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_invite_logs ENABLE ROW LEVEL SECURITY;

-- RLS: beta_config - admin ALL
CREATE POLICY "admin_all_beta_config" ON public.beta_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: beta_invites - admin ALL
CREATE POLICY "admin_all_beta_invites" ON public.beta_invites FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: beta_requests - admin ALL + public INSERT
CREATE POLICY "admin_all_beta_requests" ON public.beta_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "public_insert_beta_requests" ON public.beta_requests FOR INSERT TO anon
  WITH CHECK (true);

-- RLS: beta_testers - admin SELECT, tester own SELECT
CREATE POLICY "admin_select_beta_testers" ON public.beta_testers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "tester_select_own" ON public.beta_testers FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "tester_update_own" ON public.beta_testers FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- RLS: beta_tasks - public SELECT (everyone can see tasks)
CREATE POLICY "anyone_select_beta_tasks" ON public.beta_tasks FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "admin_all_beta_tasks" ON public.beta_tasks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: beta_task_completions - tester own ALL, admin SELECT
CREATE POLICY "tester_all_own_completions" ON public.beta_task_completions FOR ALL TO authenticated
  USING (tester_id IN (SELECT id FROM public.beta_testers WHERE user_id = auth.uid()))
  WITH CHECK (tester_id IN (SELECT id FROM public.beta_testers WHERE user_id = auth.uid()));
CREATE POLICY "admin_select_completions" ON public.beta_task_completions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS: beta_feedback - tester INSERT, admin SELECT
CREATE POLICY "tester_insert_feedback" ON public.beta_feedback FOR INSERT TO authenticated
  WITH CHECK (tester_id IN (SELECT id FROM public.beta_testers WHERE user_id = auth.uid()));
CREATE POLICY "admin_select_feedback" ON public.beta_feedback FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS: beta_events - tester INSERT, admin SELECT
CREATE POLICY "tester_insert_events" ON public.beta_events FOR INSERT TO authenticated
  WITH CHECK (tester_id IN (SELECT id FROM public.beta_testers WHERE user_id = auth.uid()));
CREATE POLICY "admin_select_events" ON public.beta_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS: beta_sessions - tester ALL own, admin SELECT
CREATE POLICY "tester_all_own_sessions" ON public.beta_sessions FOR ALL TO authenticated
  USING (tester_id IN (SELECT id FROM public.beta_testers WHERE user_id = auth.uid()))
  WITH CHECK (tester_id IN (SELECT id FROM public.beta_testers WHERE user_id = auth.uid()));
CREATE POLICY "admin_select_sessions" ON public.beta_sessions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS: beta_invite_logs - admin SELECT
CREATE POLICY "admin_select_invite_logs" ON public.beta_invite_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('beta-screenshots', 'beta-screenshots', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('beta-recordings', 'beta-recordings', false);

-- Storage RLS for beta-screenshots
CREATE POLICY "tester_upload_screenshots" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'beta-screenshots' AND EXISTS (SELECT 1 FROM public.beta_testers WHERE user_id = auth.uid()));
CREATE POLICY "admin_read_screenshots" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'beta-screenshots' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_read_recordings" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'beta-recordings' AND public.has_role(auth.uid(), 'admin'));
