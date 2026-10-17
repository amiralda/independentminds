-- DRY RUN — nothing is kept. Paste this whole block into the Supabase SQL
-- Editor and press Run. It ends in ROLLBACK, so the database is unchanged.
-- Read the single row it returns and check it against "expected" below.
BEGIN;

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

CREATE UNIQUE INDEX IF NOT EXISTS legal_consents_user_doc_version_idx
  ON public.legal_consents (user_id, document, version);


ALTER TABLE public.legal_consents ENABLE ROW LEVEL SECURITY;

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

EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.record_signup_consent() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_signup_consent() FROM anon;
REVOKE ALL ON FUNCTION public.record_signup_consent() FROM authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created_record_consent ON auth.users;
CREATE TRIGGER on_auth_user_created_record_consent
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.record_signup_consent();


SELECT
  (SELECT has_function_privilege('anon','public.record_signup_consent()','EXECUTE'))          AS anon_can_execute,
  (SELECT has_function_privilege('authenticated','public.record_signup_consent()','EXECUTE')) AS auth_can_execute,
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname='record_signup_consent')                          AS fn_count,
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.legal_consents'::regclass)           AS rls_on,
  (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='legal_consents') AS policy_count,
  (SELECT count(*) FROM pg_trigger WHERE tgrelid='auth.users'::regclass AND NOT tgisinternal) AS auth_trigger_count,
  (SELECT string_agg(tgname, ', ' ORDER BY tgname) FROM pg_trigger
     WHERE tgrelid='auth.users'::regclass AND NOT tgisinternal)                               AS auth_triggers;

ROLLBACK;
