-- Subscription management: manual activation from the admin dashboard, an
-- automatic 14-day trial for new parents, and a (disabled) expiry cron.
--
-- Facts this builds on (checked 2026-10-11):
--   * subscriptions: RLS = owner SELECT, admin SELECT, service_role ALL. No
--     admin write policy — writes go through SECURITY DEFINER functions.
--   * stripe_customer_id / stripe_subscription_id / plan_key are nullable
--     since 20260922150000 (manager-covered parents), so a row without Stripe
--     is allowed. status CHECK = trialing|active|past_due|canceled|incomplete,
--     the same list stripe-webhook's normalizeStatus() produces.
--   * Access gates look ONLY at status (trialing/active, + past_due grace).
--     Nothing expired trial_ends_at / current_period_end for rows without
--     Stripe — hence the expiry function below.
--   * get_my_effective_subscription() returns a person's OWN row first, so a
--     trial row for a co-guardian would hide the family's subscription —
--     co-guardians never get the automatic trial.
--   * protect_super_pro_plan keeps plan_key='super_pro' unless
--     app.admin_plan_change = 'on' (set below, as admin_set_plan_key does).
--
-- GRANTS (CLAUDE.md rule 4 + its 2026-10-11 clarification): the two admin
-- functions are called from the browser, so they are granted to
-- authenticated and guarded inside with has_role(auth.uid(),'admin') (42501
-- otherwise); REVOKE on PUBLIC and anon. Trigger/cron functions: no client
-- grant at all.

-- ============================================================
-- 1. Trace of every change: who, when, before -> after
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscription_admin_changes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  changed_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL = automatic (trial / expiry)
  action      text        NOT NULL CHECK (action IN ('admin_set', 'trial_auto', 'expired')),
  before      jsonb,
  after       jsonb,
  changed_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subscription_admin_changes_user ON public.subscription_admin_changes (user_id, changed_at DESC);

ALTER TABLE public.subscription_admin_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.subscription_admin_changes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.subscription_admin_changes TO authenticated;
GRANT ALL ON public.subscription_admin_changes TO service_role;
DROP POLICY IF EXISTS "admin reads subscription changes" ON public.subscription_admin_changes;
CREATE POLICY "admin reads subscription changes" ON public.subscription_admin_changes
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
-- No INSERT/UPDATE/DELETE policy: rows are written only by the SECURITY
-- DEFINER functions below.

-- The columns that describe a subscription in the trace (no Stripe customer).
CREATE OR REPLACE FUNCTION public.subscription_snapshot(s public.subscriptions)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN s.user_id IS NULL THEN NULL ELSE jsonb_build_object(
    'plan_key', s.plan_key,
    'status', s.status,
    'trial_ends_at', s.trial_ends_at,
    'current_period_end', s.current_period_end,
    'stripe_subscription_id', s.stripe_subscription_id,
    'covered_by_manager_id', s.covered_by_manager_id
  ) END
$function$;
REVOKE ALL ON FUNCTION public.subscription_snapshot(public.subscriptions) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 2. Admin: create or change a subscription by hand
-- ============================================================
-- p_ends_at: for 'trialing' it is trial_ends_at (required — a trial without an
-- end would never expire); for 'active' it is current_period_end (optional,
-- NULL = no end). Stripe columns are never written here, so an existing
-- Stripe subscription keeps its stripe_customer_id / stripe_subscription_id
-- (its own webhook may later overwrite status/plan from Stripe).
CREATE OR REPLACE FUNCTION public.admin_set_subscription(
  p_user_id  uuid,
  p_plan_key text,
  p_status   text,
  p_ends_at  timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_before public.subscriptions;
  v_after  public.subscriptions;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_plan_key IS NULL OR p_plan_key NOT IN ('basic', 'plus', 'pro', 'super_pro') THEN
    RAISE EXCEPTION 'invalid plan_key: %', p_plan_key USING ERRCODE = '22023';
  END IF;
  -- Same closed list as the table CHECK and stripe-webhook normalizeStatus().
  IF p_status IS NULL OR p_status NOT IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete') THEN
    RAISE EXCEPTION 'invalid status: %', p_status USING ERRCODE = '22023';
  END IF;
  IF p_status = 'trialing' AND p_ends_at IS NULL THEN
    RAISE EXCEPTION 'a trial needs an end date' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = p_user_id) THEN
    RAISE EXCEPTION 'no profile for user %', p_user_id USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_before FROM public.subscriptions sb WHERE sb.user_id = p_user_id FOR UPDATE;

  PERFORM set_config('app.admin_plan_change', 'on', true);
  INSERT INTO public.subscriptions AS sb (user_id, plan_key, status, trial_ends_at, current_period_end)
  VALUES (
    p_user_id, p_plan_key, p_status,
    CASE WHEN p_status = 'trialing' THEN p_ends_at END,
    CASE WHEN p_status = 'active' THEN p_ends_at END
  )
  ON CONFLICT ON CONSTRAINT subscriptions_user_id_key DO UPDATE
    SET plan_key = EXCLUDED.plan_key,
        status = EXCLUDED.status,
        trial_ends_at = CASE WHEN EXCLUDED.status = 'trialing' THEN EXCLUDED.trial_ends_at ELSE sb.trial_ends_at END,
        current_period_end = CASE WHEN EXCLUDED.status = 'active' THEN EXCLUDED.current_period_end ELSE sb.current_period_end END,
        updated_at = now()
  RETURNING * INTO v_after;
  PERFORM set_config('app.admin_plan_change', 'off', true);

  INSERT INTO public.subscription_admin_changes (user_id, changed_by, action, before, after)
  VALUES (p_user_id, auth.uid(), 'admin_set', public.subscription_snapshot(v_before), public.subscription_snapshot(v_after));

  RETURN public.subscription_snapshot(v_after);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_set_subscription(uuid, text, text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_subscription(uuid, text, text, timestamptz) TO authenticated;

-- ============================================================
-- 3. Admin: every parent with their subscription (rows or not)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_list_parent_subscriptions()
RETURNS TABLE(
  user_id uuid, email text, display_name text, is_co_guardian boolean,
  plan_key text, status text, trial_ends_at timestamptz, current_period_end timestamptz,
  has_stripe boolean, manager_covered boolean,
  last_change_at timestamptz, last_change_by text, last_change_action text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT u.id,
         u.email::text,
         pr.display_name,
         EXISTS (SELECT 1 FROM public.co_guardians cg WHERE cg.guardian_id = u.id),
         sb.plan_key,
         sb.status,
         sb.trial_ends_at,
         sb.current_period_end,
         (sb.stripe_subscription_id IS NOT NULL),
         (sb.covered_by_manager_id IS NOT NULL),
         lc.changed_at,
         lcu.email::text,
         lc.action
  FROM public.user_roles ur
  JOIN auth.users u ON u.id = ur.user_id
  LEFT JOIN public.profiles pr ON pr.id = u.id
  LEFT JOIN public.subscriptions sb ON sb.user_id = u.id
  LEFT JOIN LATERAL (
    SELECT c.changed_at, c.changed_by, c.action
    FROM public.subscription_admin_changes c
    WHERE c.user_id = u.id
    ORDER BY c.changed_at DESC
    LIMIT 1
  ) lc ON true
  LEFT JOIN auth.users lcu ON lcu.id = lc.changed_by
  WHERE ur.role = 'parent'
  ORDER BY u.created_at DESC;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_list_parent_subscriptions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_parent_subscriptions() TO authenticated;

-- ============================================================
-- 4. Automatic 14-day trial when a new PARENT confirms their email
-- ============================================================
-- Same event as the welcome email (auth.users email_confirmed_at NULL -> set).
-- Only for someone who already has the 'parent' role at that moment (email
-- signups get it at signup from handle_new_user; invited co-guardians only
-- get it later, at acceptance) and who is not a co-guardian. Students never
-- (no parent role; and their accounts are created already confirmed).
-- Idempotent: ON CONFLICT (user_id) DO NOTHING — a second confirmation, an
-- existing Stripe row, or a manager-covered row are left alone. Never blocks
-- the confirmation: any error is turned into a WARNING.
CREATE OR REPLACE FUNCTION public.trg_trial_on_email_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_row public.subscriptions;
BEGIN
  BEGIN
    IF EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = NEW.id AND r.role = 'parent')
       AND NOT EXISTS (SELECT 1 FROM public.co_guardians cg WHERE cg.guardian_id = NEW.id)
       AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = NEW.id AND r.role = 'student')
       AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = NEW.id)
    THEN
      INSERT INTO public.subscriptions (user_id, plan_key, status, trial_ends_at)
      VALUES (NEW.id, 'basic', 'trialing', now() + interval '14 days')
      ON CONFLICT ON CONSTRAINT subscriptions_user_id_key DO NOTHING
      RETURNING * INTO v_row;
      IF v_row.user_id IS NOT NULL THEN
        INSERT INTO public.subscription_admin_changes (user_id, changed_by, action, before, after)
        VALUES (NEW.id, NULL, 'trial_auto', NULL, public.subscription_snapshot(v_row));
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trial_on_email_confirmed failed for %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.trg_trial_on_email_confirmed() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trial_on_email_confirmed ON auth.users;
CREATE TRIGGER trial_on_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.trg_trial_on_email_confirmed();

-- ============================================================
-- 5. Expiry of subscriptions WITHOUT Stripe (decided by Dany 2026-10-11)
-- ============================================================
--   trialing + trial_ends_at < now()      + no stripe_subscription_id -> incomplete
--   active   + current_period_end < now() + no stripe_subscription_id -> canceled
--   any row WITH stripe_subscription_id                                -> untouched
-- (Stripe rows are kept current by stripe-webhook.) NULL end dates never expire.
CREATE OR REPLACE FUNCTION public.expire_manual_subscriptions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_trials int := 0;
  v_actives int := 0;
BEGIN
  WITH expired AS (
    UPDATE public.subscriptions sb
       SET status = 'incomplete', updated_at = now()
     WHERE sb.status = 'trialing'
       AND sb.trial_ends_at < now()
       AND sb.stripe_subscription_id IS NULL
    RETURNING sb AS r
  ), logged AS (
    INSERT INTO public.subscription_admin_changes (user_id, changed_by, action, before, after)
    SELECT (e.r).user_id, NULL, 'expired',
           public.subscription_snapshot(e.r) || jsonb_build_object('status', 'trialing'),
           public.subscription_snapshot(e.r)
    FROM expired e
    RETURNING 1
  )
  SELECT count(*) INTO v_trials FROM logged;

  WITH expired AS (
    UPDATE public.subscriptions sb
       SET status = 'canceled', updated_at = now()
     WHERE sb.status = 'active'
       AND sb.current_period_end < now()
       AND sb.stripe_subscription_id IS NULL
    RETURNING sb AS r
  ), logged AS (
    INSERT INTO public.subscription_admin_changes (user_id, changed_by, action, before, after)
    SELECT (e.r).user_id, NULL, 'expired',
           public.subscription_snapshot(e.r) || jsonb_build_object('status', 'active'),
           public.subscription_snapshot(e.r)
    FROM expired e
    RETURNING 1
  )
  SELECT count(*) INTO v_actives FROM logged;

  RETURN jsonb_build_object('trials_expired', v_trials, 'actives_expired', v_actives);
END;
$function$;

REVOKE ALL ON FUNCTION public.expire_manual_subscriptions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_manual_subscriptions() TO service_role;

-- Daily at 05:15 UTC (~01:15 in Haiti). Created DISABLED: Dany turns it on
-- himself after testing:  select cron.alter_job((select jobid from cron.job
-- where jobname = 'subscription-expiry-job'), active := true);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'subscription-expiry-job') THEN
    PERFORM cron.unschedule('subscription-expiry-job');
  END IF;
  PERFORM cron.schedule('subscription-expiry-job', '15 5 * * *', 'select public.expire_manual_subscriptions()');
  PERFORM cron.alter_job((SELECT jobid FROM cron.job WHERE jobname = 'subscription-expiry-job'), active := false);
END $$;

-- ============================================================
-- UNDO
-- ============================================================
-- select cron.unschedule('subscription-expiry-job');
-- DROP FUNCTION IF EXISTS public.expire_manual_subscriptions();
-- DROP TRIGGER IF EXISTS trial_on_email_confirmed ON auth.users;
-- DROP FUNCTION IF EXISTS public.trg_trial_on_email_confirmed();
-- DROP FUNCTION IF EXISTS public.admin_list_parent_subscriptions();
-- DROP FUNCTION IF EXISTS public.admin_set_subscription(uuid, text, text, timestamptz);
-- DROP FUNCTION IF EXISTS public.subscription_snapshot(public.subscriptions);
-- DROP TABLE IF EXISTS public.subscription_admin_changes;
-- (Rows created by the trial trigger or by admin_set_subscription stay in
-- subscriptions; list them first with:
--   select user_id from subscription_admin_changes where action in ('trial_auto','admin_set');)
