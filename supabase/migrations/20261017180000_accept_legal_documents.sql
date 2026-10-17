-- Lets a signed-in ADULT record that they accepted the current Terms and
-- Privacy Policy, so existing accounts can be brought onto v1.0 through a
-- consent gate at login.
--
-- Why an RPC. public.legal_consents deliberately has no INSERT policy: it is
-- written only by the signup trigger (SECURITY DEFINER) or the service role,
-- which keeps it append-only and unforgeable from the browser. The consent gate
-- needs the browser to record an acceptance, so it gets this one narrow,
-- audited entry point instead of an INSERT policy that would let a client write
-- arbitrary rows for arbitrary users and versions.
--
-- Three things this function will not do:
--   * It takes no user id. It writes for auth.uid() and nothing else, so one
--     user can never record consent on another's behalf.
--   * It refuses callers holding the 'student' role. Students are minors; a
--     child's click is not legally meaningful consent, their parent consents
--     for them (Terms 1.3, Privacy 2.1), and a stray client must not be able to
--     file a child's acceptance.
--   * It never updates or deletes. A re-acceptance of the same version is a
--     no-op; a new version is a new row, which is the history we want.
--
-- Additive only. UNDO block at the end of this file.

CREATE OR REPLACE FUNCTION public.accept_legal_documents(
  p_terms_version   text,
  p_privacy_version text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_user     uuid := auth.uid();
  v_inserted integer := 0;
  v_rows     integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;

  -- Minors do not consent for themselves.
  IF EXISTS (
    SELECT 1 FROM public.user_roles ur
     WHERE ur.user_id = v_user AND ur.role = 'student'
  ) THEN
    RAISE EXCEPTION 'students do not record their own consent'
      USING ERRCODE = 'IM002';
  END IF;

  IF p_terms_version IS NULL OR length(p_terms_version) NOT BETWEEN 1 AND 20
     OR p_privacy_version IS NULL OR length(p_privacy_version) NOT BETWEEN 1 AND 20 THEN
    RAISE EXCEPTION 'invalid document version' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.legal_consents (user_id, document, version, accepted_at)
  VALUES (v_user, 'terms', p_terms_version, now())
  ON CONFLICT (user_id, document, version) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_inserted := v_inserted + v_rows;

  INSERT INTO public.legal_consents (user_id, document, version, accepted_at)
  VALUES (v_user, 'privacy', p_privacy_version, now())
  ON CONFLICT (user_id, document, version) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_inserted := v_inserted + v_rows;

  RETURN v_inserted;
END;
$fn$;

-- pg_default_acl grants EXECUTE on new public functions to anon and
-- authenticated automatically, and REVOKE ... FROM PUBLIC does not undo it.
-- This one IS called from the browser, so it follows the browser-callable
-- pattern: revoke everything, then grant to authenticated only. The guard that
-- makes that safe is inside the function -- it writes for auth.uid() alone.
REVOKE ALL ON FUNCTION public.accept_legal_documents(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_legal_documents(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.accept_legal_documents(text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Verification (run after applying; all must hold)
-- ---------------------------------------------------------------------------
--   SELECT has_function_privilege('anon',
--            'public.accept_legal_documents(text,text)', 'EXECUTE')          AS anon_can,      -- false
--          has_function_privilege('authenticated',
--            'public.accept_legal_documents(text,text)', 'EXECUTE')          AS auth_can;      -- true
--
--   SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--    WHERE n.nspname = 'public' AND p.proname = 'accept_legal_documents';                      -- 1
--
--   SELECT prosecdef, array_to_string(proconfig, ',')
--     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--    WHERE n.nspname = 'public' AND p.proname = 'accept_legal_documents';    -- true, search_path pinned
--
-- A non-admin test that proves the student guard (run as a student's JWT):
--   SELECT public.accept_legal_documents('1.0', '1.0');                      -- expect SQLSTATE IM002

-- ---------------------------------------------------------------------------
-- UNDO
-- ---------------------------------------------------------------------------
-- Safe at any time. Dropping it only removes the browser's ability to record a
-- new acceptance; rows already written stay, and signup consent is unaffected
-- because that runs through the record_signup_consent trigger.
--
-- DROP FUNCTION IF EXISTS public.accept_legal_documents(text, text);
