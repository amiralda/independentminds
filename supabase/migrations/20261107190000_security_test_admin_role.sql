-- Security audit 7 Doors 2026-11-07 (HIGH, Door 1).
-- The password of test-admin@independentminds.test was committed in .env.test
-- (public repo history: 1cb7e59, 9f81932, b5892b1), and the account holds the
-- 'admin' role in production. Remove the admin role; the 'parent' role stays.
-- Approved by Dany in chat 2026-11-07 ("Fix tout").

delete from public.user_roles
where role = 'admin'
  and user_id = (select id from auth.users where email = 'test-admin@independentminds.test');

-- UNDO (only after the password was changed and is no longer public):
-- insert into public.user_roles (user_id, role)
-- select id, 'admin' from auth.users where email = 'test-admin@independentminds.test';
