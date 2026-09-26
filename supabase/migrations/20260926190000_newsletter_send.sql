-- Newsletter sending (send-newsletter-campaign edge function). Additive.

-- 1) Recipients: every parent, manager or co-guardian, one row per person
--    (a person with several roles appears once). Only confirmed, non-banned
--    accounts; non-deliverable test domains (.test, example.com) excluded.
--    Language = profiles.language_pref (lowercase ISO, 'en' fallback).
--    Server-only: reads auth.users emails, so no client role may execute it.
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
     AND (
       EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role IN ('parent', 'manager'))
       OR EXISTS (SELECT 1 FROM public.co_guardians g WHERE g.guardian_id = u.id)
     )
   ORDER BY u.created_at;
$$;

REVOKE ALL ON FUNCTION public.newsletter_recipients() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.newsletter_recipients() TO service_role;

-- 2) One row per (campaign, recipient) for real sends: a re-run skips people
--    already sent to (safe to resume after a partial failure).
CREATE TABLE IF NOT EXISTS public.newsletter_sends (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign    text NOT NULL,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  language    text NOT NULL,           -- version actually sent (EN, HT, …)
  status      text NOT NULL CHECK (status IN ('sent', 'failed')),
  resend_id   text,
  error       text,
  sent_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign, user_id)
);

ALTER TABLE public.newsletter_sends ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.newsletter_sends FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.newsletter_sends TO authenticated;
GRANT ALL ON public.newsletter_sends TO service_role;

DROP POLICY IF EXISTS "admin reads newsletter sends" ON public.newsletter_sends;
CREATE POLICY "admin reads newsletter sends" ON public.newsletter_sends
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Rollback:
--   DROP TABLE public.newsletter_sends;
--   DROP FUNCTION public.newsletter_recipients();
