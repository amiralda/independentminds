-- get_managed_parent_ids(_uid) is SECURITY DEFINER and trusts its _uid
-- argument, so any caller could pass another user's id and read the parent
-- ids linked to them (manager_parents / co_guardians). Before this migration
-- it was executable by PUBLIC and anon, i.e. without signing in.
--
-- RLS policies call it as get_managed_parent_ids(auth.uid()) under the
-- caller's role; signed-out callers have no auth.uid() and no rows to see,
-- so anon never needs it. authenticated keeps EXECUTE (required by the 13
-- "parent manages X" policies), as do service_role and postgres.
--
-- Known remaining gap (not addressed here): a signed-in user can still call
-- /rpc/get_managed_parent_ids directly with someone else's _uid.
--
-- Rollback: GRANT EXECUTE ON FUNCTION public.get_managed_parent_ids(uuid) TO PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_managed_parent_ids(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_managed_parent_ids(uuid) TO authenticated, service_role;
