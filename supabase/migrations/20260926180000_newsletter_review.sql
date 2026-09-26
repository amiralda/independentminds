-- Admin "News / Articles" review page (/admin/newsletter): admins read, edit,
-- schedule and approve newsletter drafts. Additive + tightening only.
--
-- One article = one campaign (its 10 language rows). Title/content are edited
-- per language; the publication date and the approval apply to the whole
-- campaign (the page updates all its rows in one statement).

ALTER TABLE public.email_newsletter_drafts
  ADD COLUMN IF NOT EXISTS scheduled_for date,          -- publication date (FF5 send picks approved + scheduled)
  ADD COLUMN IF NOT EXISTS approved_at   timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at    timestamptz NOT NULL DEFAULT now();

-- RLS is unchanged (admin-only SELECT and UPDATE, no INSERT/DELETE for
-- clients). Column privileges narrow what an admin can change from the app:
-- campaign, language, created_at and the approval stamps are not writable.
REVOKE UPDATE ON public.email_newsletter_drafts FROM authenticated;
GRANT UPDATE (title, content, status, scheduled_for) ON public.email_newsletter_drafts TO authenticated;

-- Server-side stamps + guard: approval is recorded by the database (who/when),
-- never trusted from the browser, and only the service role (the future send
-- job) may mark a draft 'sent' or change a draft that was already sent.
CREATE OR REPLACE FUNCTION public.newsletter_drafts_before_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF OLD.status = 'sent' THEN
      RAISE EXCEPTION 'A sent newsletter cannot be changed';
    END IF;
    IF NEW.status = 'sent' THEN
      RAISE EXCEPTION 'Only the send job can mark a newsletter as sent';
    END IF;
  END IF;

  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    NEW.approved_at := now();
    NEW.approved_by := auth.uid();
  ELSIF NEW.status NOT IN ('approved', 'sent') THEN
    NEW.approved_at := NULL;
    NEW.approved_by := NULL;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.newsletter_drafts_before_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS newsletter_drafts_before_update ON public.email_newsletter_drafts;
CREATE TRIGGER newsletter_drafts_before_update
  BEFORE UPDATE ON public.email_newsletter_drafts
  FOR EACH ROW EXECUTE FUNCTION public.newsletter_drafts_before_update();

-- Rollback:
--   DROP TRIGGER newsletter_drafts_before_update ON public.email_newsletter_drafts;
--   DROP FUNCTION public.newsletter_drafts_before_update();
--   GRANT UPDATE ON public.email_newsletter_drafts TO authenticated;
--   ALTER TABLE public.email_newsletter_drafts DROP COLUMN scheduled_for,
--     DROP COLUMN approved_at, DROP COLUMN approved_by, DROP COLUMN updated_at;
