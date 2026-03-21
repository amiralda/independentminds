-- Test has_role() function behavior
-- Usage: psql $DATABASE_URL -f tests/db/functions/has_role.sql

BEGIN;
SELECT plan(2);

-- Verify has_role returns false for non-existent user
SELECT ok(
  NOT public.has_role('00000000-0000-0000-0000-000000000000'::uuid, 'admin'),
  'has_role returns false for non-existent user'
);

-- Verify has_role returns false for wrong role
SELECT ok(
  NOT public.has_role('00000000-0000-0000-0000-000000000000'::uuid, 'superadmin'),
  'has_role returns false for non-existent role'
);

SELECT * FROM finish();
ROLLBACK;
