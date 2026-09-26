-- Newsletter unsubscribe: one single-use token per person per campaign,
-- a suppression list checked before every newsletter send. Additive.
-- Suppression applies to the newsletter only: account emails (reminders,
-- reports, invites, password reset) are not affected.

CREATE TABLE IF NOT EXISTS public.suppressed_emails (
  email            text PRIMARY KEY CHECK (email = lower(email)),
  unsubscribed_at  timestamptz NOT NULL DEFAULT now(),
  campaign_source  text,                                  -- campaign whose link was used
  reason           text NOT NULL DEFAULT 'unsubscribe'     -- kept for the older handle-email-unsubscribe code
);

CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  token       text PRIMARY KEY,                           -- 32 random bytes, base64url
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,                              -- lowercased address at creation
  campaign    text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  used_at     timestamptz,
  UNIQUE (user_id, campaign)                              -- one token per person per communication
);

ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.suppressed_emails, public.email_unsubscribe_tokens FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.suppressed_emails TO authenticated;          -- admins, via the policy below
GRANT ALL ON public.suppressed_emails, public.email_unsubscribe_tokens TO service_role;

DROP POLICY IF EXISTS "admin reads suppressed emails" ON public.suppressed_emails;
CREATE POLICY "admin reads suppressed emails" ON public.suppressed_emails
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
-- email_unsubscribe_tokens: no client access at all (tokens are secrets).

-- Token for (user, campaign): returns the existing one or creates it.
-- Server-only (send-newsletter-campaign).
CREATE OR REPLACE FUNCTION public.newsletter_unsubscribe_token(p_user_id uuid, p_campaign text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_token text;
BEGIN
  SELECT token INTO v_token FROM public.email_unsubscribe_tokens
   WHERE user_id = p_user_id AND campaign = p_campaign;
  IF v_token IS NOT NULL THEN
    RETURN v_token;
  END IF;
  INSERT INTO public.email_unsubscribe_tokens (token, user_id, email, campaign)
  SELECT translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_'),
         u.id, lower(u.email), p_campaign
    FROM auth.users u WHERE u.id = p_user_id
  ON CONFLICT (user_id, campaign) DO NOTHING
  RETURNING token INTO v_token;
  IF v_token IS NULL THEN  -- created concurrently, or unknown user
    SELECT token INTO v_token FROM public.email_unsubscribe_tokens
     WHERE user_id = p_user_id AND campaign = p_campaign;
  END IF;
  RETURN v_token;
END;
$$;

-- Use a token once: marks it used and suppresses the address, atomically.
-- Returns 'unsubscribed', 'already_used' or 'invalid'. Server-only (unsubscribe).
CREATE OR REPLACE FUNCTION public.newsletter_unsubscribe(p_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row public.email_unsubscribe_tokens;
BEGIN
  UPDATE public.email_unsubscribe_tokens SET used_at = now()
   WHERE token = p_token AND used_at IS NULL
  RETURNING * INTO v_row;
  IF NOT FOUND THEN
    RETURN CASE WHEN EXISTS (SELECT 1 FROM public.email_unsubscribe_tokens WHERE token = p_token)
                THEN 'already_used' ELSE 'invalid' END;
  END IF;
  INSERT INTO public.suppressed_emails (email, campaign_source)
  VALUES (v_row.email, v_row.campaign)
  ON CONFLICT (email) DO NOTHING;
  RETURN 'unsubscribed';
END;
$$;

REVOKE ALL ON FUNCTION public.newsletter_unsubscribe_token(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.newsletter_unsubscribe(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.newsletter_unsubscribe_token(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.newsletter_unsubscribe(text) TO service_role;

-- Recipients now exclude suppressed addresses (same definition otherwise).
CREATE OR REPLACE FUNCTION public.newsletter_recipients()
RETURNS TABLE (user_id uuid, email text, language text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT u.id, lower(u.email), coalesce(p.language_pref, 'en')
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
   WHERE u.email IS NOT NULL
     AND u.email_confirmed_at IS NOT NULL
     AND u.deleted_at IS NULL
     AND (u.banned_until IS NULL OR u.banned_until < now())
     AND lower(u.email) !~ '(\.test|@example\.(com|org|net))$'
     AND NOT EXISTS (SELECT 1 FROM public.suppressed_emails s WHERE s.email = lower(u.email))
     AND (
       EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role IN ('parent', 'manager'))
       OR EXISTS (SELECT 1 FROM public.co_guardians g WHERE g.guardian_id = u.id)
     )
   ORDER BY u.created_at;
$$;

-- Rollback:
--   restore newsletter_recipients() from 20260926190000 (without the suppressed_emails line);
--   DROP FUNCTION public.newsletter_unsubscribe(text); DROP FUNCTION public.newsletter_unsubscribe_token(uuid, text);
--   DROP TABLE public.email_unsubscribe_tokens; DROP TABLE public.suppressed_emails;
