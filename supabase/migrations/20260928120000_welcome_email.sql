-- Automatic welcome email, once per person, when someone becomes a parent
-- (signup with confirmed email), a Manager (request approved) or a
-- Co-Guardian (invite accepted). Content is an independent copy of the
-- welcome-2026-10 newsletter (10 languages): editing one never changes the
-- other. Sending is done by the send-welcome-email edge function, called
-- asynchronously through pg_net, so a failure can never block the signup,
-- the approval or the acceptance. Additive.

-- 1) Content (independent copy) ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.welcome_emails (
  language    text PRIMARY KEY CHECK (language IN ('EN','HT','FR','ES','PT','AR','ZH','DE','JA','RU')),
  title       text NOT NULL,
  content     text NOT NULL,              -- Markdown, rendered by _shared/newsletter-email.ts
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.welcome_emails (language, title, content)
SELECT language, title, content
  FROM public.email_newsletter_drafts
 WHERE campaign = 'welcome-2026-10'
ON CONFLICT (language) DO NOTHING;

ALTER TABLE public.welcome_emails ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.welcome_emails FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.welcome_emails TO authenticated;
GRANT UPDATE (title, content) ON public.welcome_emails TO authenticated;
GRANT ALL ON public.welcome_emails TO service_role;
DROP POLICY IF EXISTS "admin reads welcome emails" ON public.welcome_emails;
CREATE POLICY "admin reads welcome emails" ON public.welcome_emails
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admin updates welcome emails" ON public.welcome_emails;
CREATE POLICY "admin updates welcome emails" ON public.welcome_emails
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) One row per person: the "once per person" guarantee -------------------
CREATE TABLE IF NOT EXISTS public.welcome_email_sends (
  user_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger     text NOT NULL,              -- parent_signup | manager_approved | co_guardian_accepted | backfill
  email       text,
  language    text,                       -- version sent (EN, HT, …)
  status      text NOT NULL CHECK (status IN ('sending','sent','failed','suppressed','existing')),
  resend_id   text,
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.welcome_email_sends ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.welcome_email_sends FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.welcome_email_sends TO authenticated;
GRANT ALL ON public.welcome_email_sends TO service_role;
DROP POLICY IF EXISTS "admin reads welcome email sends" ON public.welcome_email_sends;
CREATE POLICY "admin reads welcome email sends" ON public.welcome_email_sends
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- The 4 people who already received this exact content as the newsletter
-- welcome-2026-10 are marked as welcomed, so they never get it twice.
INSERT INTO public.welcome_email_sends (user_id, trigger, email, language, status)
SELECT user_id, 'backfill', email, language, 'existing'
  FROM public.newsletter_sends
 WHERE campaign = 'welcome-2026-10' AND status = 'sent'
ON CONFLICT (user_id) DO NOTHING;

-- 3) Server-side helpers (service_role only) --------------------------------
-- Who may get the welcome email: same audience rules as the newsletter
-- (confirmed, not banned, deliverable domain, parent/manager role or
-- co-guardian), but suppression is reported instead of filtered.
CREATE OR REPLACE FUNCTION public.welcome_email_candidate(p_user_id uuid)
RETURNS TABLE (email text, language text, suppressed boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT lower(u.email), coalesce(p.language_pref, 'en'),
         EXISTS (SELECT 1 FROM public.suppressed_emails s WHERE s.email = lower(u.email))
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
   WHERE u.id = p_user_id
     AND u.email IS NOT NULL
     AND u.email_confirmed_at IS NOT NULL
     AND u.deleted_at IS NULL
     AND (u.banned_until IS NULL OR u.banned_until < now())
     AND lower(u.email) !~ '(\.test|@example\.(com|org|net))$'
     AND (
       EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role IN ('parent', 'manager'))
       OR EXISTS (SELECT 1 FROM public.co_guardians g WHERE g.guardian_id = u.id)
     );
$$;

-- Atomic claim: true only for the first caller (or a retry after 'failed').
CREATE OR REPLACE FUNCTION public.welcome_email_claim(p_user_id uuid, p_trigger text, p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_claimed uuid;
BEGIN
  INSERT INTO public.welcome_email_sends (user_id, trigger, email, status)
  VALUES (p_user_id, p_trigger, p_email, 'sending')
  ON CONFLICT (user_id) DO UPDATE
     SET status = 'sending', trigger = excluded.trigger, email = excluded.email, error = NULL, updated_at = now()
   WHERE public.welcome_email_sends.status = 'failed'
  RETURNING user_id INTO v_claimed;
  RETURN v_claimed IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.welcome_email_candidate(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.welcome_email_claim(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.welcome_email_candidate(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.welcome_email_claim(uuid, text, text) TO service_role;

-- 4) Async trigger -> edge function (never blocks the calling transaction) --
CREATE OR REPLACE FUNCTION public.enqueue_welcome_email(p_user_id uuid, p_trigger text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- cheap pre-checks; the edge function re-checks everything
  IF EXISTS (SELECT 1 FROM public.welcome_email_sends WHERE user_id = p_user_id AND status <> 'failed') THEN
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id AND email_confirmed_at IS NOT NULL) THEN
    RETURN;  -- unconfirmed signup: the confirmation will trigger it
  END IF;
  PERFORM net.http_post(
    url := 'https://gyvjcwuwfwrwwwnuwlex.supabase.co/functions/v1/send-welcome-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := jsonb_build_object('user_id', p_user_id, 'trigger', p_trigger)
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'welcome email not queued for %: %', p_user_id, SQLERRM;  -- never block the caller
END;
$$;
REVOKE ALL ON FUNCTION public.enqueue_welcome_email(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_welcome_on_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM public.enqueue_welcome_email(NEW.user_id, CASE WHEN NEW.role = 'manager' THEN 'manager_approved' ELSE 'parent_signup' END);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_welcome_on_co_guardian()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM public.enqueue_welcome_email(NEW.guardian_id, 'co_guardian_accepted');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_welcome_on_email_confirmed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM public.enqueue_welcome_email(NEW.id, 'parent_signup');
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_welcome_on_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_welcome_on_co_guardian() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_welcome_on_email_confirmed() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS welcome_on_role ON public.user_roles;
CREATE TRIGGER welcome_on_role
  AFTER INSERT ON public.user_roles
  FOR EACH ROW WHEN (NEW.role IN ('parent', 'manager'))
  EXECUTE FUNCTION public.trg_welcome_on_role();

DROP TRIGGER IF EXISTS welcome_on_co_guardian ON public.co_guardians;
CREATE TRIGGER welcome_on_co_guardian
  AFTER INSERT ON public.co_guardians
  FOR EACH ROW EXECUTE FUNCTION public.trg_welcome_on_co_guardian();

-- Email/password signups: the parent role exists before the email is
-- confirmed, so the welcome goes out when the confirmation happens.
DROP TRIGGER IF EXISTS welcome_on_email_confirmed ON auth.users;
CREATE TRIGGER welcome_on_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.trg_welcome_on_email_confirmed();

-- Rollback:
--   DROP TRIGGER welcome_on_email_confirmed ON auth.users;
--   DROP TRIGGER welcome_on_co_guardian ON public.co_guardians;
--   DROP TRIGGER welcome_on_role ON public.user_roles;
--   DROP FUNCTION public.trg_welcome_on_email_confirmed(), public.trg_welcome_on_co_guardian(),
--     public.trg_welcome_on_role(), public.enqueue_welcome_email(uuid, text),
--     public.welcome_email_claim(uuid, text, text), public.welcome_email_candidate(uuid);
--   DROP TABLE public.welcome_email_sends; DROP TABLE public.welcome_emails;
