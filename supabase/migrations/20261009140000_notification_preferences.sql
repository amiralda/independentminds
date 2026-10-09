-- Let anyone who receives the family's automatic emails pause or stop a
-- category of them, without stopping the others and without a support request.
--
-- Why this exists: co-guardians now receive every automatic email a parent
-- receives, and there was no way to turn any of it off. For a co-parent that
-- is fine. For a grandparent or a tutor invited as a co-guardian it is three
-- emails a day about a child who is not theirs, with no opt-out. One spam
-- complaint damages the sending reputation of independentmindsedu.org for
-- EVERY email to EVERY family, password resets included.
--
-- Shape:
--   * One row per (person, category). NO ROW MEANS ON, so nothing needs
--     backfilling and no one silently loses mail on the day this ships.
--   * The reserved category 'all' is a master switch: when it blocks, every
--     category is blocked, including categories added after this migration.
--   * 'paused' carries paused_until = the FIRST DAY mail resumes, as a Haiti
--     calendar date (the crons are scheduled on Haiti time; daily-report runs
--     at 01:00 UTC = 20:00 Haiti the day before). The UI says "Resumes <date>",
--     never "until <date>". A pause whose date has arrived is simply not
--     blocking any more — no cron job is needed to expire it.
--
-- Anyone with a user account can have preferences, parent or co-guardian.
-- Each person controls only their own: a parent cannot silence a co-guardian's
-- mail and a co-guardian cannot silence a parent's.
--
-- GRANTS: in this project, new functions in `public` get EXECUTE for anon and
-- authenticated by DEFAULT PRIVILEGES (pg_default_acl), and REVOKE ... FROM
-- PUBLIC does not remove those explicit grants. Every function below therefore
-- revokes from anon and authenticated explicitly and grants service_role only.

-- ============================================================
-- 1. Preferences
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category     text        NOT NULL,
  state        text        NOT NULL DEFAULT 'on',
  paused_until date,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, category),
  CONSTRAINT notification_preferences_category_check
    CHECK (category IN ('all','morning_reminder','checkin_reminder','daily_report','weekly_badge')),
  CONSTRAINT notification_preferences_state_check
    CHECK (state IN ('on','paused','off')),
  -- A pause without an end date would be indistinguishable from 'off'.
  CONSTRAINT notification_preferences_paused_needs_date
    CHECK (state <> 'paused' OR paused_until IS NOT NULL)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Each person manages only their own preferences. The frontend reads/writes
-- this table directly for the signed-in user; RLS limits it to their rows.
DROP POLICY IF EXISTS "own notification preferences" ON public.notification_preferences;
CREATE POLICY "own notification preferences"
  ON public.notification_preferences
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins read-only, for support ("why am I not getting mail?").
DROP POLICY IF EXISTS "admin reads notification preferences" ON public.notification_preferences;
CREATE POLICY "admin reads notification preferences"
  ON public.notification_preferences
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));


-- ============================================================
-- 2. One definition of "is this person still receiving X?"
-- ============================================================
-- service_role only: it is SECURITY DEFINER and takes any p_user_id, so a
-- signed-in caller could otherwise learn whether someone else opted out.

CREATE OR REPLACE FUNCTION public.is_notification_enabled(p_user_id uuid, p_category text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.notification_preferences np
    WHERE np.user_id = p_user_id
      AND np.category IN ('all', p_category)
      AND (
        np.state = 'off'
        -- paused_until = first day mail resumes, on the Haiti calendar
        OR (np.state = 'paused'
            AND np.paused_until > (now() AT TIME ZONE 'America/Port-au-Prince')::date)
      )
  )
$function$;

REVOKE ALL ON FUNCTION public.is_notification_enabled(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_notification_enabled(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.is_notification_enabled(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.is_notification_enabled(uuid, text) TO service_role;


-- ============================================================
-- 2b. Footer tokens (used by section 3 and section 4)
-- ============================================================
-- One long-lived token per person (not per email); see section 4.

CREATE TABLE IF NOT EXISTS public.notification_pref_tokens (
  user_id    uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- pgcrypto lives in the `extensions` schema; qualified so this does not
  -- depend on the migration session's search_path.
  token      text        NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_pref_tokens ENABLE ROW LEVEL SECURITY;
-- No policy on purpose: only service_role (which bypasses RLS) touches this.
-- A leaked token must not be lookup-able by a signed-in user.


-- ============================================================
-- 3. Recipient list now filters on the category
-- ============================================================
-- p_category DEFAULTs to NULL on purpose: the four notification functions are
-- ALREADY LIVE calling this with one argument. A required second parameter
-- would break the crons the moment this migration is applied. With NULL the
-- old call keeps its current behaviour until those functions are redeployed.
--
-- The one-argument version MUST be dropped first. CREATE OR REPLACE with an
-- extra parameter does not replace it — it adds a second overload. A call with
-- one argument would then match both (the new one via its DEFAULT) and
-- Postgres would reject it: "function notify_recipients_for_parent(uuid) is
-- not unique". Dropping first leaves one function whose single-argument form
-- resolves with p_category = NULL. Migrations run in a transaction, so there
-- is no window where neither exists.

--
-- It also returns, per recipient, the footer token (pref_token) and the UI
-- language (lang), so the senders build each footer with NO extra call per
-- recipient: still one RPC per family per run. Tokens are created here on the
-- first send (one per person, never rotated), which is why the function is
-- plpgsql VOLATILE instead of sql STABLE. Callers that only read
-- user_id/email/kind (the live v6 functions) ignore the extra columns.
--
-- PL/pgSQL note: the RETURNS TABLE columns are variables in the body (and can
-- be qualified with the function name). Every column below is qualified, the
-- upsert uses ON CONSTRAINT, and the subquery alias is `rcp` — never a bare
-- user_id/email/kind/lang, never an alias that could clash (42702 otherwise;
-- both traps reproduced on pg_temp 2026-10-09).

DROP FUNCTION IF EXISTS public.notify_recipients_for_parent(uuid);

CREATE OR REPLACE FUNCTION public.notify_recipients_for_parent(
  p_parent_id uuid,
  p_category  text DEFAULT NULL
)
RETURNS TABLE(user_id uuid, email text, kind text, pref_token text, lang text)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Make sure every person of this family has a footer token.
  INSERT INTO public.notification_pref_tokens (user_id)
  SELECT u.id
  FROM (
    SELECT p_parent_id AS uid
    UNION
    SELECT cg.guardian_id
    FROM public.co_guardians cg
    WHERE cg.parent_id = p_parent_id
      AND cg.guardian_id IS NOT NULL
  ) rcp
  JOIN auth.users u ON u.id = rcp.uid
  ON CONFLICT ON CONSTRAINT notification_pref_tokens_pkey DO NOTHING;

  RETURN QUERY
  SELECT u.id,
         u.email::text,
         rcp.kind,
         t.token,
         -- profiles.language_pref holds the UI language as a lowercase ISO code
         coalesce(nullif(lower(p.language_pref), ''), 'en')
  FROM (
    SELECT p_parent_id AS uid, 'parent'::text AS kind
    UNION
    SELECT cg.guardian_id, 'co_guardian'::text
    FROM public.co_guardians cg
    WHERE cg.parent_id = p_parent_id
      AND cg.guardian_id IS NOT NULL
  ) rcp
  JOIN auth.users u ON u.id = rcp.uid
  LEFT JOIN public.notification_pref_tokens t ON t.user_id = u.id
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.email IS NOT NULL
    -- never mail a deleted or banned account
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
-- 4. One-click link from the email footer
-- ============================================================
-- A long-lived token per person (not per email): every footer carries the same
-- link, so a person can act on an email from last week. The token identifies
-- the person; the category travels in the URL. The only actions it can perform
-- are pausing or stopping mail — nothing destructive, and everything it does
-- is reversible from the same page. The endpoint never changes anything on GET
-- (link scanners prefetch GETs); changes are POSTs, same as `unsubscribe`.


-- Tokens are created by notify_recipients_for_parent() on the first send
-- (section 3), so there is no separate get-or-create function to expose.


-- Applies a change from the emailed link. Validates the token itself, so the
-- public endpoint never needs to read the token table or trust its caller.
-- Called with p_category NULL it changes nothing and only returns the set.
-- Returns {email, prefs: [{category, state, paused_until}]} so the page can
-- render it (also when the person has no rows yet = everything on). The raw
-- email only goes to service_role; the endpoint masks it before replying.
CREATE OR REPLACE FUNCTION public.apply_notification_token_action(
  p_token        text,
  p_category     text,
  p_state        text,
  p_paused_until date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_email   text;
BEGIN
  SELECT t.user_id, u.email::text INTO v_user_id, v_email
  FROM public.notification_pref_tokens t
  JOIN auth.users u ON u.id = t.user_id
  WHERE t.token = p_token;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid token' USING ERRCODE = '28000';
  END IF;

  IF p_category IS NOT NULL THEN
    -- NULL NOT IN (...) is NULL, not TRUE: check NULL explicitly.
    IF p_state IS NULL OR p_state NOT IN ('on','paused','off') THEN
      RAISE EXCEPTION 'invalid state' USING ERRCODE = '22023';
    END IF;
    IF p_state = 'paused' AND p_paused_until IS NULL THEN
      RAISE EXCEPTION 'paused requires a date' USING ERRCODE = '22023';
    END IF;

    -- ON CONSTRAINT: explicit about which uniqueness is meant. (The first
    -- draft returned TABLE(category, state, ...), whose PL/pgSQL variables made
    -- a bare ON CONFLICT (user_id, category) ambiguous — 42702, reproduced
    -- 2026-10-09. Returning jsonb removes those variables altogether.)
    INSERT INTO public.notification_preferences (user_id, category, state, paused_until, updated_at)
    VALUES (v_user_id, p_category, p_state,
            CASE WHEN p_state = 'paused' THEN p_paused_until ELSE NULL END, now())
    ON CONFLICT ON CONSTRAINT notification_preferences_pkey DO UPDATE
      SET state = EXCLUDED.state,
          paused_until = EXCLUDED.paused_until,
          updated_at = now();
  END IF;

  RETURN jsonb_build_object(
    'email', v_email,
    'prefs', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'category', np.category,
               'state', np.state,
               'paused_until', np.paused_until)
             ORDER BY np.category)
      FROM public.notification_preferences np
      WHERE np.user_id = v_user_id
    ), '[]'::jsonb)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_notification_token_action(text, text, text, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_notification_token_action(text, text, text, date) FROM anon;
REVOKE ALL ON FUNCTION public.apply_notification_token_action(text, text, text, date) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_notification_token_action(text, text, text, date) TO service_role;


-- ============================================================
-- UNDO
-- ============================================================
-- DROP FUNCTION IF EXISTS public.apply_notification_token_action(text, text, text, date);
-- DROP FUNCTION IF EXISTS public.notify_recipients_for_parent(uuid, text);
-- DROP TABLE IF EXISTS public.notification_pref_tokens;
-- DROP FUNCTION IF EXISTS public.is_notification_enabled(uuid, text);
-- DROP TABLE IF EXISTS public.notification_preferences;
--
-- Then restore the single-argument recipient function from migration
-- 20261009120000_co_guardian_notifications.sql (body + its four REVOKE/GRANT
-- lines), or the four notification functions fall back to parent-only.
-- Drop the two-argument version BEFORE recreating the one-argument version,
-- for the same overload-ambiguity reason explained in section 3.
