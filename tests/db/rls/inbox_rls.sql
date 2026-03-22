BEGIN;
SELECT plan(4);

SELECT ok((SELECT relrowsecurity FROM pg_class WHERE relname='inbox_messages' AND relnamespace='public'::regnamespace), 'inbox_messages has RLS');

SELECT ok(EXISTS(SELECT 1 FROM pg_policies WHERE tablename='inbox_messages' AND policyname='no_client_insert_inbox'), 'no client INSERT on inbox');
SELECT ok(EXISTS(SELECT 1 FROM pg_policies WHERE tablename='inbox_messages' AND policyname='no_client_delete_inbox'), 'no client DELETE on inbox');
SELECT ok(EXISTS(SELECT 1 FROM pg_policies WHERE tablename='inbox_messages' AND policyname='parent_reads_own_messages'), 'parent reads own messages');

SELECT * FROM finish();
ROLLBACK;
