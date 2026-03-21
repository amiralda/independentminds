
-- Guardian invites table
CREATE TABLE public.guardian_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email text NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '7 days',
  accepted_at timestamptz
);

-- Co-guardians table
CREATE TABLE public.co_guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  guardian_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  can_view_progress boolean DEFAULT true,
  can_receive_sos boolean DEFAULT false,
  can_approve_rewards boolean DEFAULT false,
  can_edit_lessons boolean DEFAULT false,
  is_full_access boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, guardian_id)
);

-- Inbox messages table
CREATE TABLE public.inbox_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id text NOT NULL,
  message_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  source_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guardian_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.co_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;

-- Guardian invites policies
CREATE POLICY "parent_manages_invites" ON public.guardian_invites
  FOR ALL USING (
    invited_by = auth.uid()
  );

CREATE POLICY "admin_reads_invites" ON public.guardian_invites
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Co-guardians policies
CREATE POLICY "parent_manages_co_guardians" ON public.co_guardians
  FOR ALL USING (invited_by = auth.uid());

CREATE POLICY "co_guardian_reads_own" ON public.co_guardians
  FOR SELECT USING (guardian_id = auth.uid());

CREATE POLICY "admin_reads_co_guardians" ON public.co_guardians
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Inbox messages policies
CREATE POLICY "parent_reads_own_messages" ON public.inbox_messages
  FOR SELECT USING (auth.uid() = parent_id);

CREATE POLICY "parent_marks_messages_read" ON public.inbox_messages
  FOR UPDATE USING (auth.uid() = parent_id);

CREATE POLICY "admin_reads_inbox" ON public.inbox_messages
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- No client insert on inbox_messages (edge functions only)
CREATE POLICY "no_client_insert_inbox" ON public.inbox_messages
  FOR INSERT WITH CHECK (false);

CREATE POLICY "no_client_delete_inbox" ON public.inbox_messages
  FOR DELETE USING (false);

-- Helper function: check co-guardian permission
CREATE OR REPLACE FUNCTION public.has_guardian_permission(
  uid uuid,
  sid text,
  permission text
)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.co_guardians
    WHERE guardian_id = uid
      AND student_id = sid
      AND (
        is_full_access = true OR
        (permission = 'view_progress' AND can_view_progress = true) OR
        (permission = 'receive_sos' AND can_receive_sos = true) OR
        (permission = 'approve_rewards' AND can_approve_rewards = true) OR
        (permission = 'edit_lessons' AND can_edit_lessons = true)
      )
  );
$$;

-- Co-guardian inbox policy for SOS
CREATE POLICY "co_guardian_reads_sos" ON public.inbox_messages
  FOR SELECT USING (
    message_type = 'sos' AND
    has_guardian_permission(auth.uid(), student_id, 'receive_sos')
  );

-- Enable realtime for inbox
ALTER PUBLICATION supabase_realtime ADD TABLE public.inbox_messages;
