BEGIN;
SELECT plan(3);

SELECT ok((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND p.proname='has_guardian_permission'), 'has_guardian_permission() is SECURITY DEFINER');

SELECT ok((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND p.proname='is_my_student'), 'is_my_student() is SECURITY DEFINER');

SELECT ok((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND p.proname='get_my_role'), 'get_my_role() is SECURITY DEFINER');

SELECT * FROM finish();
ROLLBACK;
