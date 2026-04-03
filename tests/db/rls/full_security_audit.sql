-- Security audit for Independent Minds EDU
-- Plain SQL (no pgTAP dependency) — runs against remote Supabase via psql
-- Returns non-zero exit code on any failure

\set ON_ERROR_STOP on

BEGIN;

-- Helper: collect failures instead of aborting on first
CREATE TEMP TABLE _audit_results (
  test_name text NOT NULL,
  passed boolean NOT NULL
);

-- ============================================================
-- 1. RLS enabled on all key tables
-- ============================================================
INSERT INTO _audit_results
SELECT 'RLS: ' || t.tbl,
       COALESCE((SELECT relrowsecurity FROM pg_class WHERE relname = t.tbl AND relnamespace = 'public'::regnamespace), false)
FROM (VALUES
  ('profiles'),('students'),('daily_plan'),('co_guardians'),
  ('guardian_invites'),('inbox_messages'),('user_roles'),
  ('flagged_inputs'),('messages_log'),('rate_limits'),
  ('ai_conversations'),('merge_requests')
) AS t(tbl);

-- ============================================================
-- 2. Security-definer functions exist
-- ============================================================
INSERT INTO _audit_results
SELECT 'SECDEF: ' || f.fn,
       COALESCE((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = f.fn LIMIT 1), false)
FROM (VALUES
  ('has_role'),('has_guardian_permission'),('award_points'),
  ('redeem_reward'),('increment_rate_limit'),('delete_my_account')
) AS f(fn);

-- ============================================================
-- 3. Required columns exist
-- ============================================================
INSERT INTO _audit_results
SELECT 'COL: ' || c.tbl || '.' || c.col,
       EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = c.tbl AND column_name = c.col
       )
FROM (VALUES
  ('profiles','adult_confirmed'),
  ('profiles','adult_confirmed_at'),
  ('profiles','language_pref'),
  ('profiles','onboarding_step'),
  ('parent_settings','telegram_bot_token'),
  ('guardian_invites','token'),
  ('guardian_invites','expires_at'),
  ('admin_notifications','notification_type'),
  ('admin_notifications','metadata'),
  ('impersonation_logs','parent_id'),
  ('impersonation_logs','student_id'),
  ('impersonation_logs','action')
) AS c(tbl, col);

-- ============================================================
-- 4. Rate-limits INSERT policy exists
-- ============================================================
INSERT INTO _audit_results
SELECT 'POLICY: rate_limits has INSERT policy',
       EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rate_limits' AND cmd = 'INSERT');

INSERT INTO _audit_results
SELECT 'POLICY: flagged_inputs has policies',
       EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'flagged_inputs');

-- ============================================================
-- Print results
-- ============================================================
\echo ''
\echo '====== SECURITY AUDIT RESULTS ======'

SELECT test_name,
       CASE WHEN passed THEN '✅ PASS' ELSE '❌ FAIL' END AS result
FROM _audit_results
ORDER BY passed, test_name;

-- Final pass/fail check
DO $$
DECLARE
  fail_count integer;
BEGIN
  SELECT count(*) INTO fail_count FROM _audit_results WHERE NOT passed;
  IF fail_count > 0 THEN
    RAISE EXCEPTION '% audit check(s) FAILED', fail_count;
  ELSE
    RAISE NOTICE 'All audit checks passed ✅';
  END IF;
END $$;

ROLLBACK;
