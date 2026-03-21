
-- has_role security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;

-- RLS policies for user_roles
CREATE POLICY "admin_reads_roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_reads_own_role" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "no_client_insert_roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (false);

CREATE POLICY "no_client_update_roles" ON public.user_roles
  FOR UPDATE TO authenticated USING (false);

CREATE POLICY "no_client_delete_roles" ON public.user_roles
  FOR DELETE TO authenticated USING (false);

-- set_user_role RPC (admin only)
CREATE OR REPLACE FUNCTION public.set_user_role(target_uid uuid, new_role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (target_uid, new_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- remove_user_role RPC (admin only)
CREATE OR REPLACE FUNCTION public.remove_user_role(target_uid uuid, old_role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  DELETE FROM public.user_roles WHERE user_id = target_uid AND role = old_role;
END;
$$;

-- Admin read policies on existing tables for cross-tenant analytics
CREATE POLICY "admin_reads_all_students" ON public.students
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_reads_all_profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_reads_all_activity_logs" ON public.activity_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_reads_all_check_ins" ON public.check_ins
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_reads_all_reward_points" ON public.reward_points
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_reads_all_reward_redemptions" ON public.reward_redemptions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_reads_all_rewards_catalog" ON public.rewards_catalog
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_reads_all_messages_log" ON public.messages_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_reads_all_flagged_inputs" ON public.flagged_inputs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_reads_all_merge_requests" ON public.merge_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_updates_merge_requests" ON public.merge_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_reads_all_challenges" ON public.challenges
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
