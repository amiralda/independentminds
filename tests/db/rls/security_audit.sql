-- Independent Minds EDU v4.1 — pgTAP Security Audit
-- Run against database to verify all critical tables have RLS enabled.
-- Usage: psql $DATABASE_URL -f tests/db/rls/security_audit.sql

BEGIN;
SELECT plan(20);

-- Verify critical tables exist
SELECT has_table('public', 'profiles',         'profiles table exists');
SELECT has_table('public', 'students',         'students table exists');
SELECT has_table('public', 'daily_plan',       'daily_plan table exists');
SELECT has_table('public', 'co_guardians',     'co_guardians table exists');
SELECT has_table('public', 'guardian_invites',  'guardian_invites table exists');
SELECT has_table('public', 'inbox_messages',    'inbox_messages table exists');
SELECT has_table('public', 'user_roles',        'user_roles table exists');
SELECT has_table('public', 'flagged_inputs',    'flagged_inputs table exists');
SELECT has_table('public', 'messages_log',      'messages_log table exists');

-- Verify RLS is enabled on critical tables
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles' AND relnamespace = 'public'::regnamespace),
  'RLS enabled on profiles'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'students' AND relnamespace = 'public'::regnamespace),
  'RLS enabled on students'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'user_roles' AND relnamespace = 'public'::regnamespace),
  'RLS enabled on user_roles'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'co_guardians' AND relnamespace = 'public'::regnamespace),
  'RLS enabled on co_guardians'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'inbox_messages' AND relnamespace = 'public'::regnamespace),
  'RLS enabled on inbox_messages'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'flagged_inputs' AND relnamespace = 'public'::regnamespace),
  'RLS enabled on flagged_inputs'
);

-- Verify security definer functions exist
SELECT has_function('public', 'has_role', ARRAY['uuid', 'text'], 'has_role() function exists');
SELECT ok(
  (SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
   WHERE n.nspname = 'public' AND p.proname = 'has_role'),
  'has_role() is SECURITY DEFINER'
);

SELECT has_function('public', 'is_my_student', ARRAY['text'], 'is_my_student() function exists');
SELECT ok(
  (SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
   WHERE n.nspname = 'public' AND p.proname = 'is_my_student'),
  'is_my_student() is SECURITY DEFINER'
);

-- Verify adult_confirmed column exists
SELECT has_column('public', 'profiles', 'adult_confirmed', 'adult_confirmed column exists');

SELECT * FROM finish();
ROLLBACK;
