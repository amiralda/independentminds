-- Co-guardians must receive every automatic notification the parent receives.
--
-- Today each notification function resolves its recipient as
--   students -> student.parent_id -> that one parent's email
-- so a co-guardian gets nothing, even though they have full read/write access
-- to the family's data. Confirmed empirically: between 2026-10-02 (when the
-- first co-guardian in the system was created) and 2026-10-07, messages_log
-- holds 5 days x 3 emails for each parent and not one row for the co-guardian.
--
-- The notification functions are deliberately self-contained — their own
-- comments say the deploy bundler could not resolve supabase/functions/_shared
-- imports for this function set. So this list lives in the database instead of
-- a shared TS module: one definition, no copy-pasted logic across the four
-- functions (morning-reminder, checkin-reminder, daily-report, weekly-badge),
-- and callers only change `const email` into a loop.
--
-- SECURITY: SECURITY DEFINER because it reads auth.users for the address.
-- EXECUTE is granted to service_role ONLY. The notification functions run with
-- the service key. It is deliberately NOT granted to `authenticated`: that
-- would let any signed-in user read other people's email addresses.
--
-- Additive only: one new function + one new nullable column.

-- 1) Who gets the family's notifications: the parent + every co-guardian.
CREATE OR REPLACE FUNCTION public.notify_recipients_for_parent(p_parent_id uuid)
RETURNS TABLE(user_id uuid, email text, kind text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT u.id, u.email::text, r.kind
  FROM (
    -- the parent themself
    SELECT p_parent_id AS uid, 'parent'::text AS kind
    UNION
    -- every co-guardian attached to that parent
    SELECT cg.guardian_id, 'co_guardian'::text
    FROM public.co_guardians cg
    WHERE cg.parent_id = p_parent_id
      AND cg.guardian_id IS NOT NULL
  ) r
  JOIN auth.users u ON u.id = r.uid
  WHERE u.email IS NOT NULL
    -- never mail a deleted or banned account
    AND u.deleted_at IS NULL
    AND (u.banned_until IS NULL OR u.banned_until <= now())
  ORDER BY (r.kind = 'parent') DESC, u.email
$function$;

REVOKE ALL ON FUNCTION public.notify_recipients_for_parent(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_recipients_for_parent(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.notify_recipients_for_parent(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.notify_recipients_for_parent(uuid) TO service_role;

-- 2) messages_log: parent_id = which family, recipient_id = who actually got it.
-- Nullable: rows written before this migration (and any caller not yet updated)
-- keep recipient_id NULL, meaning "the parent" by the old convention.
ALTER TABLE public.messages_log
  ADD COLUMN IF NOT EXISTS recipient_id uuid;

COMMENT ON COLUMN public.messages_log.recipient_id IS
  'auth.users id of the person the message was actually sent to (parent or co-guardian). NULL on rows written before 2026-10-09 = the parent.';


-- ============================================================
-- UNDO
-- ============================================================
-- ALTER TABLE public.messages_log DROP COLUMN IF EXISTS recipient_id;
-- DROP FUNCTION IF EXISTS public.notify_recipients_for_parent(uuid);
