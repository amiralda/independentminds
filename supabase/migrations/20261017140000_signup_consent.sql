-- Signup consent: record which legal documents a user accepted, and when.
--
-- Why: the Terms and Privacy Policy published on 2026-10-17 are binding on
-- users, but nothing recorded what anyone agreed to. Without a record there is
-- no proof of acceptance, and no way to tell who still needs to re-consent when
-- a document changes.
--
-- Design note. The source of truth for consent is `auth.users.raw_user_meta_data`,
-- which Supabase writes atomically as part of account creation and which this
-- migration never touches. The table below is a queryable MIRROR of that, filled
-- by an AFTER INSERT trigger that is deliberately written so it can never fail
-- the signup transaction: if the mirror write breaks for any reason, the account
-- is still created and the proof still exists in the metadata.
--
-- This is additive only. It does not alter `handle_new_user` or its trigger
-- `on_auth_user_created` -- those are the highest-risk objects in this database
-- and a second, independent trigger is safer than editing them.
--
-- UNDO block at the end of this file.

-- ---------------------------------------------------------------------------
-- 1. The table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.legal_consents (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document    text        NOT NULL CHECK (document IN ('terms', 'privacy')),
  version     text        NOT NULL CHECK (length(version) BETWEEN 1 AND 20),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.legal_consents IS
  'Append-only mirror of legal document acceptance. Source of truth is auth.users.raw_user_meta_data; this table exists so consent can be queried and reported on. Never UPDATE or DELETE rows here -- a new acceptance is a new row.';

CREATE INDEX IF NOT EXISTS legal_consents_user_id_idx
  ON public.legal_consents (user_id);

-- One row per user per document per version: re-running the trigger, or a user
-- re-accepting the same version, must not create duplicates. A NEW version of a
-- document is a new row, which is the history we want.
CREATE UNIQUE INDEX IF NOT EXISTS legal_consents_user_doc_version_idx
  ON public.legal_consents (user_id, document, version);

-- ---------------------------------------------------------------------------
-- 2. RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.legal_consents ENABLE ROW LEVEL SECURITY;

-- A user may read their own consent record. That is all a client may do:
-- there is no INSERT, UPDATE or DELETE policy, so the table is append-only
-- from the application's point of view and is written solely by the trigger
-- (SECURITY DEFINER) or by the service role.
DROP POLICY IF EXISTS "Users read their own consent records" ON public.legal_consents;
CREATE POLICY "Users read their own consent records"
  ON public.legal_consents
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins read all consent records" ON public.legal_consents;
CREATE POLICY "Admins read all consent records"
  ON public.legal_consents
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 3. The mirror trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_signup_consent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_terms   text;
  v_privacy text;
  v_at      timestamptz;
BEGIN
  v_terms   := NEW.raw_user_meta_data ->> 'terms_version';
  v_privacy := NEW.raw_user_meta_data ->> 'privacy_version';

  -- A malformed timestamp in metadata must not cost us the consent record.
  BEGIN
    v_at := (NEW.raw_user_meta_data ->> 'terms_accepted_at')::timestamptz;
  EXCEPTION WHEN OTHERS THEN
    v_at := now();
  END;
  IF v_at IS NULL THEN
    v_at := now();
  END IF;

  IF v_terms IS NOT NULL AND v_terms <> '' THEN
    INSERT INTO public.legal_consents (user_id, document, version, accepted_at)
    VALUES (NEW.id, 'terms', left(v_terms, 20), v_at)
    ON CONFLICT (user_id, document, version) DO NOTHING;
  END IF;

  IF v_privacy IS NOT NULL AND v_privacy <> '' THEN
    INSERT INTO public.legal_consents (user_id, document, version, accepted_at)
    VALUES (NEW.id, 'privacy', left(v_privacy, 20), v_at)
    ON CONFLICT (user_id, document, version) DO NOTHING;
  END IF;

  RETURN NEW;

-- Deliberate catch-all. This trigger runs inside the signup transaction, so an
-- unhandled error here would stop people creating accounts. Consent proof lives
-- in auth.users.raw_user_meta_data either way, so losing the mirror row is
-- recoverable; losing signup is not.
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- New functions in `public` are granted EXECUTE to anon and authenticated
-- automatically by pg_default_acl, and REVOKE ... FROM PUBLIC does not undo it.
-- This one is called only by the trigger, so both roles are revoked explicitly.
REVOKE ALL ON FUNCTION public.record_signup_consent() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_signup_consent() FROM anon;
REVOKE ALL ON FUNCTION public.record_signup_consent() FROM authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created_record_consent ON auth.users;
CREATE TRIGGER on_auth_user_created_record_consent
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.record_signup_consent();

-- ---------------------------------------------------------------------------
-- 4. Verification (run after applying; all four must hold)
-- ---------------------------------------------------------------------------
--
-- a) The function is not callable by anon or authenticated:
--      SELECT has_function_privilege('anon',          'public.record_signup_consent()', 'EXECUTE') AS anon_can,
--             has_function_privilege('authenticated', 'public.record_signup_consent()', 'EXECUTE') AS auth_can;
--      -- expected: false, false
--
-- b) Exactly one function of that name exists (no accidental overload):
--      SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--       WHERE n.nspname = 'public' AND p.proname = 'record_signup_consent';
--      -- expected: 1
--
-- c) auth.users carries FOUR non-internal triggers afterwards -- the three that
--    were already there (verified in production 2026-10-17) plus the new one:
--      SELECT tgname FROM pg_trigger
--       WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal ORDER BY tgname;
--      -- expected exactly: on_auth_user_created,
--      --                   on_auth_user_created_record_consent,
--      --                   trial_on_email_confirmed,
--      --                   welcome_on_email_confirmed
--    If any of the original three is missing, STOP and roll back -- this
--    migration must add a trigger, never replace one.
--
-- d) RLS is on and exactly two SELECT policies exist:
--      SELECT relrowsecurity FROM pg_class WHERE oid = 'public.legal_consents'::regclass;
--      SELECT policyname, cmd FROM pg_policies
--       WHERE schemaname = 'public' AND tablename = 'legal_consents' ORDER BY policyname;
--      -- expected: true; two rows, both SELECT

-- ---------------------------------------------------------------------------
-- UNDO
-- ---------------------------------------------------------------------------
-- Removing the trigger and function is safe at any time: signup keeps working
-- because handle_new_user is untouched, and consent proof remains in
-- auth.users.raw_user_meta_data.
--
-- Dropping the table destroys the mirrored consent records. Those are legal
-- evidence -- export them first:
--   \copy (SELECT * FROM public.legal_consents) TO 'legal_consents_backup.csv' CSV HEADER
--
-- DROP TRIGGER IF EXISTS on_auth_user_created_record_consent ON auth.users;
-- DROP FUNCTION IF EXISTS public.record_signup_consent();
-- DROP POLICY IF EXISTS "Admins read all consent records" ON public.legal_consents;
-- DROP POLICY IF EXISTS "Users read their own consent records" ON public.legal_consents;
-- DROP INDEX IF EXISTS public.legal_consents_user_doc_version_idx;
-- DROP INDEX IF EXISTS public.legal_consents_user_id_idx;
-- DROP TABLE IF EXISTS public.legal_consents;
