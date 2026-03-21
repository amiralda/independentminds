
ALTER TABLE public.guardian_invites
  ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{"can_view_progress": true, "can_receive_sos": false, "can_approve_rewards": false, "can_edit_lessons": false, "is_full_access": false}'::jsonb;
