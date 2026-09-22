-- Monitor role + co-guardian RLS integration + subscriptions marker column.
-- Approved plan: see docs/ACTIVITY_LOG.md 2026-09-22 (3rd follow-up).
-- Co-guardian's own invite mechanism (send-guardian-invite/accept-guardian-invite
-- edge functions + CoGuardiansPanel.tsx UI) is a separately-broken schema
-- mismatch, deliberately deferred to a future session — this migration only
-- makes backend access (RLS) correct for whatever co_guardians rows exist.

-- 1) Allow 'monitor' as a user_roles value. Assignment stays admin-only:
-- the only INSERT path on user_roles is "admin manages roles" (has_role
-- admin) — unchanged, not touched by this migration.
ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role = ANY (ARRAY['admin'::text, 'parent'::text, 'student'::text, 'monitor'::text]));

-- 2) monitor_parents: source of truth for which parents a monitor manages.
CREATE TABLE public.monitor_parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (monitor_id, parent_id)
);
ALTER TABLE public.monitor_parents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monitor reads own managed parents" ON public.monitor_parents
  FOR SELECT USING (monitor_id = auth.uid());
CREATE POLICY "parent reads own monitor link" ON public.monitor_parents
  FOR SELECT USING (parent_id = auth.uid());
CREATE POLICY "admin manages monitor_parents" ON public.monitor_parents
  FOR ALL USING (has_role(auth.uid(), 'admin'::text)) WITH CHECK (has_role(auth.uid(), 'admin'::text));
CREATE POLICY "service role manages monitor_parents" ON public.monitor_parents
  FOR ALL TO service_role USING (true) WITH CHECK (true);
-- No self-service INSERT policy for the monitor role itself: a monitor_parents
-- row is only ever created by the monitor-create-parent edge function
-- (service role) or by an admin.

-- 3) Shared helper (same SECURITY DEFINER pattern as has_role()): every
-- parent_id a caller may act as — themselves, any parent they monitor, or
-- any parent whose family they co-guard. One definition, reused everywhere
-- below, so nothing drifts out of sync table-by-table.
CREATE OR REPLACE FUNCTION public.get_managed_parent_ids(_uid uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT _uid
  UNION
  SELECT parent_id FROM public.monitor_parents WHERE monitor_id = _uid
  UNION
  SELECT parent_id FROM public.co_guardians WHERE guardian_id = _uid
$$;

-- 4) Rewrite every existing "parent manages X" policy to route through
-- get_managed_parent_ids() instead of a bare parent_id = auth.uid() / a bare
-- students.parent_id = auth.uid() subquery. Same access level each table
-- already granted the parent (ALL stays ALL, SELECT-only stays SELECT-only)
-- — monitor/co-guardian never get MORE than the parent already had.
-- Deliberately NOT touched: co_guardians, guardian_invites, parent_settings,
-- subscriptions — access-control and billing tables stay parent-exclusive.

-- 4a) Direct parent_id = auth.uid() pattern.
DROP POLICY IF EXISTS "parent manages own students" ON public.students;
CREATE POLICY "parent manages own students" ON public.students
  FOR ALL USING (parent_id IN (SELECT public.get_managed_parent_ids(auth.uid())));

DROP POLICY IF EXISTS "parent manages rewards_catalog" ON public.rewards_catalog;
CREATE POLICY "parent manages rewards_catalog" ON public.rewards_catalog
  FOR ALL USING (parent_id IN (SELECT public.get_managed_parent_ids(auth.uid())));

DROP POLICY IF EXISTS "parent manages templates" ON public.schedule_templates;
CREATE POLICY "parent manages templates" ON public.schedule_templates
  FOR ALL USING (parent_id IN (SELECT public.get_managed_parent_ids(auth.uid())));

DROP POLICY IF EXISTS "parent manages inbox" ON public.inbox_messages;
CREATE POLICY "parent manages inbox" ON public.inbox_messages
  FOR ALL USING (parent_id IN (SELECT public.get_managed_parent_ids(auth.uid())));

-- 4b) Via students.parent_id pattern.
DROP POLICY IF EXISTS "parent reads achievements" ON public.achievements;
CREATE POLICY "parent reads achievements" ON public.achievements
  FOR SELECT USING (student_id IN (
    SELECT s.id FROM public.students s WHERE s.parent_id IN (SELECT public.get_managed_parent_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "parent manages activity_logs" ON public.activity_logs;
CREATE POLICY "parent manages activity_logs" ON public.activity_logs
  FOR ALL USING (student_id IN (
    SELECT s.id FROM public.students s WHERE s.parent_id IN (SELECT public.get_managed_parent_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "parent manages ai_conversations" ON public.ai_conversations;
CREATE POLICY "parent manages ai_conversations" ON public.ai_conversations
  FOR ALL USING (student_id IN (
    SELECT s.id FROM public.students s WHERE s.parent_id IN (SELECT public.get_managed_parent_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "parent manages check_ins" ON public.check_ins;
CREATE POLICY "parent manages check_ins" ON public.check_ins
  FOR ALL USING (student_id IN (
    SELECT s.id FROM public.students s WHERE s.parent_id IN (SELECT public.get_managed_parent_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "parent manages daily_plan" ON public.daily_plan;
CREATE POLICY "parent manages daily_plan" ON public.daily_plan
  FOR ALL USING (student_id IN (
    SELECT s.id FROM public.students s WHERE s.parent_id IN (SELECT public.get_managed_parent_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "parent manages learning_tools" ON public.learning_tools;
CREATE POLICY "parent manages learning_tools" ON public.learning_tools
  FOR ALL USING (student_id IN (
    SELECT s.id FROM public.students s WHERE s.parent_id IN (SELECT public.get_managed_parent_ids(auth.uid()))
  ))
  WITH CHECK (student_id IN (
    SELECT s.id FROM public.students s WHERE s.parent_id IN (SELECT public.get_managed_parent_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "parent reads reward_points" ON public.reward_points;
CREATE POLICY "parent reads reward_points" ON public.reward_points
  FOR SELECT USING (student_id IN (
    SELECT s.id FROM public.students s WHERE s.parent_id IN (SELECT public.get_managed_parent_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "parent manages redemptions" ON public.reward_redemptions;
CREATE POLICY "parent manages redemptions" ON public.reward_redemptions
  FOR ALL USING (student_id IN (
    SELECT s.id FROM public.students s WHERE s.parent_id IN (SELECT public.get_managed_parent_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "parent manages subject_tracks" ON public.subject_tracks;
CREATE POLICY "parent manages subject_tracks" ON public.subject_tracks
  FOR ALL USING (student_id IN (
    SELECT s.id FROM public.students s WHERE s.parent_id IN (SELECT public.get_managed_parent_ids(auth.uid()))
  ));

-- 5) subscriptions: prep columns for Part 2 (billing invoicing) only.
-- Marker column + relax 3 NOT NULLs so a monitor-created parent (no real
-- Stripe subscription yet) can have a row at all. status stays NOT NULL
-- with its existing CHECK (trialing/active/past_due/canceled/incomplete) —
-- 'incomplete' already means "not active" to both useSubscription.ts and
-- every server-side gate, so no gating logic changes. stripe-webhook's
-- upsert uses onConflict:"user_id" and only sets the columns it lists, so a
-- real Stripe checkout later fills stripe_customer_id/stripe_subscription_id/
-- plan_key/status without touching covered_by_monitor_id. No Stripe/webhook
-- code changed by this migration.
ALTER TABLE public.subscriptions
  ALTER COLUMN stripe_customer_id DROP NOT NULL,
  ALTER COLUMN stripe_subscription_id DROP NOT NULL,
  ALTER COLUMN plan_key DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS covered_by_monitor_id uuid REFERENCES auth.users(id);
