-- Password reset throttle: one reset request per account every 15 minutes,
-- shared by every path (parent/Manager "Reset Password" link for a student,
-- and the public "Forgot password?" form for any account). Edge functions
-- check it BEFORE calling Supabase Auth, so a throttled request never reaches
-- the Auth email rate limit. Additive only.

CREATE TABLE public.password_reset_requests (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id           uuid NULL REFERENCES public.students(id) ON DELETE SET NULL,
  requested_by         text NOT NULL CHECK (requested_by IN ('parent', 'manager', 'self')),
  requested_by_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX password_reset_requests_user_time_idx
  ON public.password_reset_requests (user_id, requested_at DESC);

-- RLS on with no policies: only service_role (edge functions) can touch it.
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.password_reset_requests FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.password_reset_requests TO service_role;

-- Check + record atomically. The advisory lock serializes concurrent clicks
-- for the same account so two requests can't both pass the check.
CREATE FUNCTION public.claim_password_reset(
  p_user_id uuid, p_student_id uuid, p_requested_by text, p_actor uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_last timestamptz;
  v_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('pwreset:' || p_user_id::text, 0));

  SELECT max(requested_at) INTO v_last
  FROM public.password_reset_requests
  WHERE user_id = p_user_id AND requested_at > now() - interval '15 minutes';

  IF v_last IS NOT NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'retry_after_seconds',
      greatest(1, ceil(extract(epoch FROM v_last + interval '15 minutes' - now())))::int
    );
  END IF;

  INSERT INTO public.password_reset_requests (user_id, student_id, requested_by, requested_by_user_id)
  VALUES (p_user_id, p_student_id, p_requested_by, p_actor)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('allowed', true, 'request_id', v_id);
END
$$;
REVOKE ALL ON FUNCTION public.claim_password_reset(uuid, uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_password_reset(uuid, uuid, text, uuid) TO service_role;

-- auth.admin has no lookup-by-email; the public reset form needs one.
CREATE FUNCTION public.find_auth_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(trim(p_email)) LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.find_auth_user_id_by_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_auth_user_id_by_email(text) TO service_role;

-- Rollback:
--   DROP FUNCTION public.find_auth_user_id_by_email(text);
--   DROP FUNCTION public.claim_password_reset(uuid, uuid, text, uuid);
--   DROP TABLE public.password_reset_requests;
