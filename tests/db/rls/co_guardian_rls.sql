BEGIN;
SELECT plan(5);

SELECT ok((SELECT relrowsecurity FROM pg_class WHERE relname='co_guardians' AND relnamespace='public'::regnamespace), 'co_guardians has RLS');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE relname='guardian_invites' AND relnamespace='public'::regnamespace), 'guardian_invites has RLS');

SELECT ok(EXISTS(SELECT 1 FROM pg_policies WHERE tablename='co_guardians' AND policyname='parent_manages_co_guardians'), 'parent_manages_co_guardians policy exists');
SELECT ok(EXISTS(SELECT 1 FROM pg_policies WHERE tablename='co_guardians' AND policyname='co_guardian_reads_own'), 'co_guardian_reads_own policy exists');

SELECT ok((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND p.proname='has_guardian_permission'), 'has_guardian_permission() SECURITY DEFINER');

SELECT * FROM finish();
ROLLBACK;
