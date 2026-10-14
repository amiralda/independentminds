-- Managers receive the family's automatic emails (morning reminder, check-in
-- reminder, daily report, weekly badge), like the parent and co-guardians.
-- Decision: Dany, 2026-10-14.
--
-- Facts this builds on (checked 2026-10-14):
--   * notify_recipients_for_parent has ONE signature in production:
--     (p_parent_id uuid, p_category text DEFAULT NULL), RETURNS TABLE(user_id,
--     email, kind, pref_token, lang). The 1-argument form was dropped by the
--     notification_preferences migration (20261009140000 in the repo,
--     20261009181632 in production's history). The signature below is the same, so CREATE OR REPLACE
--     replaces it (a different one would add an overload and make every cron
--     call ambiguous).
--   * manager_parents (manager_id, parent_id), both NOT NULL, UNIQUE pair.
--   * Edge functions only pass `kind` through to renderPrefsFooter; the only
--     test is kind === "co_guardian" (footer wording), so 'manager' cannot
--     break a condition. It currently gets the parent wording until the
--     footer learns a manager line (separate change, edge functions).
--
-- One row per person: someone with two roles for the same family (e.g.
-- co-guardian AND manager) gets ONE email, with the highest role:
-- parent > co_guardian > manager. Parent first in the result.
-- is_notification_enabled is applied to everyone, unchanged.

CREATE OR REPLACE FUNCTION public.notify_recipients_for_parent(
  p_parent_id uuid,
  p_category  text DEFAULT NULL
)
RETURNS TABLE(user_id uuid, email text, kind text, pref_token text, lang text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Every recipient needs a preferences token for the footer links.
  INSERT INTO public.notification_pref_tokens (user_id)
  SELECT u.id
  FROM (
    SELECT p_parent_id AS uid
    UNION
    SELECT cg.guardian_id
    FROM public.co_guardians cg
    WHERE cg.parent_id = p_parent_id
      AND cg.guardian_id IS NOT NULL
    UNION
    SELECT mp.manager_id
    FROM public.manager_parents mp
    WHERE mp.parent_id = p_parent_id
  ) rcp
  JOIN auth.users u ON u.id = rcp.uid
  ON CONFLICT ON CONSTRAINT notification_pref_tokens_pkey DO NOTHING;

  RETURN QUERY
  SELECT u.id,
         u.email::text,
         rcp.kind,
         t.token,
         coalesce(nullif(lower(p.language_pref), ''), 'en')
  FROM (
    -- One row per person, highest role kept.
    SELECT DISTINCT ON (r.uid) r.uid, r.kind
    FROM (
      SELECT p_parent_id AS uid, 'parent'::text AS kind, 1 AS priority
      UNION ALL
      SELECT cg.guardian_id, 'co_guardian'::text, 2
      FROM public.co_guardians cg
      WHERE cg.parent_id = p_parent_id
        AND cg.guardian_id IS NOT NULL
      UNION ALL
      SELECT mp.manager_id, 'manager'::text, 3
      FROM public.manager_parents mp
      WHERE mp.parent_id = p_parent_id
    ) r
    ORDER BY r.uid, r.priority
  ) rcp
  JOIN auth.users u ON u.id = rcp.uid
  LEFT JOIN public.notification_pref_tokens t ON t.user_id = u.id
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.email IS NOT NULL
    AND u.deleted_at IS NULL
    AND (u.banned_until IS NULL OR u.banned_until <= now())
    AND (p_category IS NULL OR public.is_notification_enabled(u.id, p_category))
  ORDER BY (rcp.kind = 'parent') DESC, u.email;
END;
$function$;

REVOKE ALL ON FUNCTION public.notify_recipients_for_parent(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_recipients_for_parent(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.notify_recipients_for_parent(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.notify_recipients_for_parent(uuid, text) TO service_role;

-- ============================================================
-- UNDO (back to the 20261009140000 version: parent + co-guardians only)
-- ============================================================
-- CREATE OR REPLACE FUNCTION public.notify_recipients_for_parent(
--   p_parent_id uuid,
--   p_category  text DEFAULT NULL
-- )
-- RETURNS TABLE(user_id uuid, email text, kind text, pref_token text, lang text)
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path TO 'public'
-- AS $function$
-- BEGIN
--   INSERT INTO public.notification_pref_tokens (user_id)
--   SELECT u.id
--   FROM (
--     SELECT p_parent_id AS uid
--     UNION
--     SELECT cg.guardian_id
--     FROM public.co_guardians cg
--     WHERE cg.parent_id = p_parent_id
--       AND cg.guardian_id IS NOT NULL
--   ) rcp
--   JOIN auth.users u ON u.id = rcp.uid
--   ON CONFLICT ON CONSTRAINT notification_pref_tokens_pkey DO NOTHING;
--   RETURN QUERY
--   SELECT u.id,
--          u.email::text,
--          rcp.kind,
--          t.token,
--          coalesce(nullif(lower(p.language_pref), ''), 'en')
--   FROM (
--     SELECT p_parent_id AS uid, 'parent'::text AS kind
--     UNION
--     SELECT cg.guardian_id, 'co_guardian'::text
--     FROM public.co_guardians cg
--     WHERE cg.parent_id = p_parent_id
--       AND cg.guardian_id IS NOT NULL
--   ) rcp
--   JOIN auth.users u ON u.id = rcp.uid
--   LEFT JOIN public.notification_pref_tokens t ON t.user_id = u.id
--   LEFT JOIN public.profiles p ON p.id = u.id
--   WHERE u.email IS NOT NULL
--     AND u.deleted_at IS NULL
--     AND (u.banned_until IS NULL OR u.banned_until <= now())
--     AND (p_category IS NULL OR public.is_notification_enabled(u.id, p_category))
--   ORDER BY (rcp.kind = 'parent') DESC, u.email;
-- END;
-- $function$;
-- (Grants are kept by CREATE OR REPLACE. Tokens created for managers stay in
-- notification_pref_tokens; they are harmless and unused once undone.)
