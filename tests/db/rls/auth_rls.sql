BEGIN;
SELECT plan(6);

SELECT ok((SELECT relrowsecurity FROM pg_class WHERE relname='profiles' AND relnamespace='public'::regnamespace), 'profiles has RLS');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE relname='user_roles' AND relnamespace='public'::regnamespace), 'user_roles has RLS');

SELECT ok(EXISTS(SELECT 1 FROM pg_policies WHERE tablename='profiles' AND cmd='SELECT'), 'profiles has SELECT policy');
SELECT ok(EXISTS(SELECT 1 FROM pg_policies WHERE tablename='profiles' AND cmd='INSERT'), 'profiles has INSERT policy');
SELECT ok(EXISTS(SELECT 1 FROM pg_policies WHERE tablename='profiles' AND cmd='UPDATE'), 'profiles has UPDATE policy');

SELECT ok((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND p.proname='handle_new_user'), 'handle_new_user() is SECURITY DEFINER');

SELECT * FROM finish();
ROLLBACK;
