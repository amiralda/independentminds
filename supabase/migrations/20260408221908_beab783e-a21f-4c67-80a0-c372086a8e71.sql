
-- 1. educator_invites table
CREATE TABLE public.educator_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  invitee_email text NOT NULL,
  parent_id uuid NOT NULL,
  student_id text, -- NULL = all parent's students
  permissions jsonb NOT NULL DEFAULT '{"can_edit_schedule":false,"can_view_checkins":true,"can_use_ai_tutor":false,"can_view_reports":true,"can_receive_sos":false}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.educator_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parent_manages_educator_invites" ON public.educator_invites
  FOR ALL TO authenticated
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "admin_reads_educator_invites" ON public.educator_invites
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 2. educators table
CREATE TABLE public.educators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  invited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, invited_by)
);

ALTER TABLE public.educators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "educator_reads_own" ON public.educators
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "parent_reads_their_educators" ON public.educators
  FOR SELECT TO authenticated
  USING (invited_by = auth.uid());

CREATE POLICY "admin_reads_all_educators" ON public.educators
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 3. educator_students table
CREATE TABLE public.educator_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_id uuid NOT NULL REFERENCES public.educators(id) ON DELETE CASCADE,
  student_id text NOT NULL,
  can_edit_schedule boolean NOT NULL DEFAULT false,
  can_view_checkins boolean NOT NULL DEFAULT true,
  can_use_ai_tutor boolean NOT NULL DEFAULT false,
  can_view_reports boolean NOT NULL DEFAULT true,
  can_receive_sos boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(educator_id, student_id)
);

ALTER TABLE public.educator_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "educator_reads_own_assignments" ON public.educator_students
  FOR SELECT TO authenticated
  USING (educator_id IN (SELECT id FROM public.educators WHERE user_id = auth.uid()));

CREATE POLICY "parent_manages_educator_assignments" ON public.educator_students
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.educators e
      JOIN public.students s ON s.parent_id = e.invited_by
      WHERE e.id = educator_students.educator_id
        AND s.student_id = educator_students.student_id
        AND e.invited_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.educators e
      JOIN public.students s ON s.parent_id = e.invited_by
      WHERE e.id = educator_students.educator_id
        AND s.student_id = educator_students.student_id
        AND e.invited_by = auth.uid()
    )
  );

CREATE POLICY "admin_reads_all_educator_students" ON public.educator_students
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 4. educator_requests table (independent applications)
CREATE TABLE public.educator_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  expertise text,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.educator_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_insert_educator_requests" ON public.educator_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL);

CREATE POLICY "admin_all_educator_requests" ON public.educator_requests
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 5. Security definer: is_my_educator_student
CREATE OR REPLACE FUNCTION public.is_my_educator_student(_student_id text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.educator_students es
    JOIN public.educators e ON e.id = es.educator_id
    WHERE e.user_id = auth.uid()
      AND es.student_id = _student_id
  )
$$;

-- 6. Security definer: has_educator_permission
CREATE OR REPLACE FUNCTION public.has_educator_permission(_user_id uuid, _student_id text, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.educator_students es
    JOIN public.educators e ON e.id = es.educator_id
    WHERE e.user_id = _user_id
      AND es.student_id = _student_id
      AND (
        (_permission = 'edit_schedule' AND es.can_edit_schedule = true) OR
        (_permission = 'view_checkins' AND es.can_view_checkins = true) OR
        (_permission = 'use_ai_tutor' AND es.can_use_ai_tutor = true) OR
        (_permission = 'view_reports' AND es.can_view_reports = true) OR
        (_permission = 'receive_sos' AND es.can_receive_sos = true)
      )
  )
$$;

-- 7. RLS on existing tables for educator access

-- daily_plan: educators can SELECT assigned students
CREATE POLICY "educator_reads_daily_plan" ON public.daily_plan
  FOR SELECT TO authenticated
  USING (is_my_educator_student(student_id));

-- activity_logs: educators can SELECT assigned students
CREATE POLICY "educator_reads_activity_logs" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (is_my_educator_student(student_id));

-- check_ins: educators can SELECT if can_view_checkins
CREATE POLICY "educator_reads_check_ins" ON public.check_ins
  FOR SELECT TO authenticated
  USING (has_educator_permission(auth.uid(), student_id, 'view_checkins'));

-- ai_conversations: educators can SELECT if can_use_ai_tutor
CREATE POLICY "educator_reads_ai_conversations" ON public.ai_conversations
  FOR SELECT TO authenticated
  USING (has_educator_permission(auth.uid(), student_id, 'use_ai_tutor'));

-- subject_tracks: educators can view assigned students
CREATE POLICY "educator_reads_subject_tracks" ON public.subject_tracks
  FOR SELECT TO authenticated
  USING (is_my_educator_student(student_id));

-- curriculum_map: educators can view if parent shared
CREATE POLICY "educator_reads_curriculum_map" ON public.curriculum_map
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.educators e
      JOIN public.educator_students es ON es.educator_id = e.id
      WHERE e.user_id = auth.uid()
        AND es.student_id IN (
          SELECT s.student_id FROM public.students s WHERE s.parent_id = curriculum_map.user_id
        )
    )
  );
