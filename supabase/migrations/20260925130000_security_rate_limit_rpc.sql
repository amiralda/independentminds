-- Security audit 2026-09-25 (HIGH): ai-tutor calls increment_rate_limit() for
-- its 30 requests/hour cap, but the function was never created on this
-- project, so the call errored, rateData was null and the cap silently never
-- applied (unlimited paid OpenAI calls per account). Create it against the
-- real rate_limits table (user_id, action, count, window_start). Additive.

CREATE UNIQUE INDEX IF NOT EXISTS rate_limits_user_action_window_key
  ON public.rate_limits (user_id, action, window_start);

CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  p_user_id uuid, p_function_name text, p_window_start timestamptz, p_limit integer
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.rate_limits (user_id, action, window_start, count)
  VALUES (p_user_id, p_function_name, p_window_start, 1)
  ON CONFLICT (user_id, action, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO v_count;
  RETURN json_build_object('count', v_count, 'allowed', v_count <= p_limit);
END
$$;
-- Server-side only (edge functions use the service role).
REVOKE ALL ON FUNCTION public.increment_rate_limit(uuid, text, timestamptz, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_rate_limit(uuid, text, timestamptz, integer) TO service_role;

-- Rollback:
--   DROP FUNCTION public.increment_rate_limit(uuid, text, timestamptz, integer);
--   DROP INDEX public.rate_limits_user_action_window_key;
