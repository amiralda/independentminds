-- 1) Global duplicate-student check (AddStudentFullForm).
--
-- RLS on students limits each parent to their own family's rows, so a plain
-- client SELECT cannot see duplicates created by another account. This
-- SECURITY DEFINER function looks across ALL families but returns ONLY a
-- boolean -- never ids, parent info, or any other column -- so no other
-- family's data is exposed. It requires both name and DOB (the caller must
-- already know both), and is callable only by signed-in users.
CREATE OR REPLACE FUNCTION public.student_duplicate_exists(p_display_name text, p_date_of_birth date)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND p_date_of_birth IS NOT NULL
    AND length(btrim(coalesce(p_display_name, ''))) >= 2
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.date_of_birth = p_date_of_birth
        AND lower(regexp_replace(btrim(s.display_name), '\s+', ' ', 'g'))
          = lower(regexp_replace(btrim(p_display_name), '\s+', ' ', 'g'))
    );
$$;

REVOKE ALL ON FUNCTION public.student_duplicate_exists(text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.student_duplicate_exists(text, date) TO authenticated;

-- 2) 'super_pro' plan. subscriptions.plan_key has no CHECK constraint, so the
-- new value needs no schema change. Every access gate (ai-tutor,
-- weekly-report-data, SubscriptionGate) keys off status, not plan_key.
--
-- super_pro is granted manually, not sold through Stripe. stripe-webhook
-- upserts plan_key from Stripe metadata on every subscription/invoice event,
-- which would silently revert super_pro back to the Stripe plan. This trigger
-- keeps super_pro unless the change comes through admin_set_plan_key().
CREATE OR REPLACE FUNCTION public.protect_super_pro_plan()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.plan_key = 'super_pro'
     AND NEW.plan_key IS DISTINCT FROM 'super_pro'
     AND coalesce(current_setting('app.admin_plan_change', true), '') <> 'on' THEN
    NEW.plan_key := OLD.plan_key;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_super_pro_plan ON public.subscriptions;
CREATE TRIGGER protect_super_pro_plan
  BEFORE UPDATE OF plan_key ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.protect_super_pro_plan();

-- 3) Admin-only manual plan change (AdminBilling). Admins have no UPDATE
-- policy on subscriptions; rather than grant a broad one (status, Stripe ids),
-- this function updates plan_key only, for admins only, from a fixed list.
CREATE OR REPLACE FUNCTION public.admin_set_plan_key(p_user_id uuid, p_plan_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_plan_key NOT IN ('basic', 'plus', 'pro', 'super_pro') THEN
    RAISE EXCEPTION 'invalid plan_key: %', p_plan_key USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('app.admin_plan_change', 'on', true);
  UPDATE public.subscriptions
     SET plan_key = p_plan_key, updated_at = now()
   WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no subscription row for user %', p_user_id USING ERRCODE = 'P0002';
  END IF;
  PERFORM set_config('app.admin_plan_change', 'off', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_plan_key(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_plan_key(uuid, text) TO authenticated;
