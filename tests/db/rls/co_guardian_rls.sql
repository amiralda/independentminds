-- Test co-guardian RLS policies
-- Usage: psql $DATABASE_URL -f tests/db/rls/co_guardian_rls.sql

BEGIN;
SELECT plan(3);

-- Verify has_guardian_permission function exists
SELECT has_function('public', 'has_guardian_permission', ARRAY['uuid', 'text', 'text'],
  'has_guardian_permission() function exists');

SELECT ok(
  (SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
   WHERE n.nspname = 'public' AND p.proname = 'has_guardian_permission'),
  'has_guardian_permission() is SECURITY DEFINER'
);

-- Verify co_guardians table has RLS
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'co_guardians' AND relnamespace = 'public'::regnamespace),
  'RLS enabled on co_guardians'
);

SELECT * FROM finish();
ROLLBACK;
