-- Newsletter drafts, one row per language. Drafts only: nothing is sent from
-- here; sending is a separate, explicitly approved step. Each user will get
-- only the version in their own language (profiles.language_pref), EN as the
-- fallback. Additive.

CREATE TABLE IF NOT EXISTS public.email_newsletter_drafts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign    text NOT NULL,                 -- groups the language versions of one issue
  language    text NOT NULL CHECK (language IN ('EN','HT','FR','ES','PT','AR','ZH','DE','JA','RU')),
  title       text NOT NULL,
  content     text NOT NULL,                 -- Markdown
  status      text NOT NULL DEFAULT 'pending_approval'
              CHECK (status IN ('pending_approval','approved','sent','archived')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign, language)
);

ALTER TABLE public.email_newsletter_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_newsletter_drafts FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON public.email_newsletter_drafts TO authenticated;
GRANT ALL ON public.email_newsletter_drafts TO service_role;

-- Admins review and approve drafts; nobody else sees them.
DROP POLICY IF EXISTS "admin reads newsletter drafts" ON public.email_newsletter_drafts;
CREATE POLICY "admin reads newsletter drafts" ON public.email_newsletter_drafts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admin updates newsletter drafts" ON public.email_newsletter_drafts;
CREATE POLICY "admin updates newsletter drafts" ON public.email_newsletter_drafts
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Rollback: DROP TABLE public.email_newsletter_drafts;
