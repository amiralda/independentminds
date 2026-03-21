-- Test RLS policies: anonymous users cannot read protected tables
-- Usage: psql $DATABASE_URL -f tests/db/rls/auth_rls.sql

BEGIN;
SELECT plan(6);

SET LOCAL role TO anon;

SELECT is_empty(
  $$ SELECT * FROM public.profiles LIMIT 1 $$,
  'Anonymous cannot read profiles'
);
SELECT is_empty(
  $$ SELECT * FROM public.students LIMIT 1 $$,
  'Anonymous cannot read students'
);
SELECT is_empty(
  $$ SELECT * FROM public.user_roles LIMIT 1 $$,
  'Anonymous cannot read user_roles'
);
SELECT is_empty(
  $$ SELECT * FROM public.flagged_inputs LIMIT 1 $$,
  'Anonymous cannot read flagged_inputs'
);
SELECT is_empty(
  $$ SELECT * FROM public.inbox_messages LIMIT 1 $$,
  'Anonymous cannot read inbox_messages'
);
SELECT is_empty(
  $$ SELECT * FROM public.co_guardians LIMIT 1 $$,
  'Anonymous cannot read co_guardians'
);

SELECT * FROM finish();
ROLLBACK;
