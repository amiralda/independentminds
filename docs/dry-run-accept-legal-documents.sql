-- DRY RUN - nothing is kept. Paste this whole block into the Supabase SQL
-- Editor and press Run. It ends in ROLLBACK, so the database is unchanged.
--
-- It creates the function, then exercises it for real by impersonating two
-- actual production users through request.jwt.claims:
--   * a STUDENT, who must be refused (SQLSTATE IM002)
--   * a PARENT, who must have two consent rows recorded
-- and finally checks the privileges and shape of the function itself.
--
-- Read the two result rows it returns and check them against docs/ACTIVITY_LOG
-- or the message that came with this file.

BEGIN;

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

REVOKE ALL ON FUNCTION public.accept_legal_documents(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_legal_documents(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.accept_legal_documents(text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Behaviour test, against two real production users
-- ---------------------------------------------------------------------------
-- The two test subjects are looked up rather than hardcoded: this repository
-- is public, so production user ids do not belong in it, and a lookup also
-- makes this file runnable against any copy of the database.
DO $test$
DECLARE
  v_student uuid;
  v_parent  uuid;
  v_student_refused text := 'NO - STUDENT WAS ALLOWED, DO NOT APPLY';
  v_parent_rows integer;
BEGIN
  SELECT user_id INTO v_student
    FROM public.user_roles WHERE role = 'student' LIMIT 1;

  SELECT user_id INTO v_parent
    FROM public.user_roles
   WHERE role = 'parent'
     AND user_id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'student')
   LIMIT 1;

  IF v_student IS NULL OR v_parent IS NULL THEN
    RAISE EXCEPTION 'need one student and one non-student parent to test against; found student=%, parent=%',
      v_student IS NOT NULL, v_parent IS NOT NULL;
  END IF;

  -- A student must be refused.
  BEGIN
    PERFORM set_config('request.jwt.claims',
                       json_build_object('sub', v_student::text)::text, true);
    PERFORM public.accept_legal_documents('1.0', '1.0');
  EXCEPTION
    WHEN SQLSTATE 'IM002' THEN v_student_refused := 'yes - refused with IM002';
    WHEN OTHERS THEN v_student_refused := 'refused, but with ' || SQLSTATE || ' not IM002';
  END;

  -- A parent must have both documents recorded.
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', v_parent::text)::text, true);
  v_parent_rows := public.accept_legal_documents('1.0', '1.0');

  CREATE TEMP TABLE dry_run_result ON COMMIT DROP AS
  SELECT v_student_refused                                   AS student_refused,
         v_parent_rows                                       AS parent_rows_written,
         (SELECT count(*) FROM public.legal_consents
           WHERE user_id = v_parent)                         AS parent_rows_total,
         (SELECT count(*) FROM public.legal_consents
           WHERE user_id = v_student)                        AS student_rows_must_be_zero;

  PERFORM set_config('request.jwt.claims', NULL, true);
END;
$test$;

SELECT * FROM dry_run_result;

-- ---------------------------------------------------------------------------
-- Privileges and shape
-- ---------------------------------------------------------------------------
SELECT
  has_function_privilege('anon',
    'public.accept_legal_documents(text,text)', 'EXECUTE')                      AS anon_can_execute,
  has_function_privilege('authenticated',
    'public.accept_legal_documents(text,text)', 'EXECUTE')                      AS auth_can_execute,
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname='accept_legal_documents')            AS fn_count,
  (SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname='accept_legal_documents')            AS is_security_definer,
  (SELECT array_to_string(proconfig, ',') FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname='accept_legal_documents')            AS fn_search_path;

ROLLBACK;
