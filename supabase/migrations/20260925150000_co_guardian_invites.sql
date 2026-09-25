-- Co-guardian invites on the REAL schema (family level: co_guardians
-- (parent_id, guardian_id), guardian_invites (parent_id, email, token)).
-- Decisions (approved 2026-09-25): only the primary parent invites; only the
-- invited email can accept; a co-guardian has the same access as the parent
-- (permission toggles dropped from the UI); the family's subscription covers
-- the co-guardian. Invites are created/accepted by edge functions only.

-- 1) Invite bookkeeping + one pending invite per email per family.
ALTER TABLE public.guardian_invites
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS guardian_invites_one_pending_per_email
  ON public.guardian_invites (parent_id, lower(email)) WHERE status = 'pending';

-- 2) No anon access at all (RLS already blocked it; remove the grants too).
REVOKE ALL ON public.co_guardians FROM anon;
REVOKE ALL ON public.guardian_invites FROM anon;

-- 3) co_guardians: a parent could INSERT any user id as a co-guardian of
--    their family (no consent). Rows are now created only by
--    accept-guardian-invite (service role). The parent keeps read + revoke.
DROP POLICY IF EXISTS "parent manages co_guardians" ON public.co_guardians;
DROP POLICY IF EXISTS "parent reads co_guardians" ON public.co_guardians;
CREATE POLICY "parent reads co_guardians" ON public.co_guardians
  FOR SELECT TO authenticated USING (parent_id = auth.uid());
DROP POLICY IF EXISTS "parent revokes co_guardians" ON public.co_guardians;
CREATE POLICY "parent revokes co_guardians" ON public.co_guardians
  FOR DELETE TO authenticated USING (parent_id = auth.uid());
-- ("guardian reads own" SELECT policy is kept.)

-- guardian_invites: the parent reads and revokes (status update) their own
-- invites; creation goes through send-guardian-invite.
DROP POLICY IF EXISTS "parent manages guardian_invites" ON public.guardian_invites;
DROP POLICY IF EXISTS "parent reads guardian_invites" ON public.guardian_invites;
CREATE POLICY "parent reads guardian_invites" ON public.guardian_invites
  FOR SELECT TO authenticated USING (parent_id = auth.uid());
DROP POLICY IF EXISTS "parent revokes guardian_invites" ON public.guardian_invites;
CREATE POLICY "parent revokes guardian_invites" ON public.guardian_invites
  FOR UPDATE TO authenticated
  USING (parent_id = auth.uid() AND status = 'pending')
  WITH CHECK (parent_id = auth.uid() AND status = 'revoked');

-- 4) The parent's list of co-guardians with a readable name/email (profiles
--    RLS only exposes your own profile).
CREATE OR REPLACE FUNCTION public.get_my_co_guardians()
RETURNS TABLE (id uuid, guardian_id uuid, email text, display_name text, invited_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT cg.id, cg.guardian_id, u.email::text, p.display_name, cg.invited_at
  FROM public.co_guardians cg
  LEFT JOIN auth.users u ON u.id = cg.guardian_id
  LEFT JOIN public.profiles p ON p.id = cg.guardian_id
  WHERE cg.parent_id = auth.uid()
  ORDER BY cg.invited_at
$$;
REVOKE ALL ON FUNCTION public.get_my_co_guardians() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_co_guardians() TO authenticated;

-- 5) Paywall: a co-guardian is covered by the family's subscription. Own
--    subscription first, then a student account's family, then the family of
--    a parent you co-guard (an active one if there are several).
CREATE OR REPLACE FUNCTION public.get_my_effective_subscription()
RETURNS TABLE(status text, plan_key text, current_period_end timestamptz, trial_ends_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT sub.status, sub.plan_key, sub.current_period_end, sub.trial_ends_at
  FROM public.subscriptions sub
  WHERE sub.user_id = COALESCE(
    (SELECT s2.user_id FROM public.subscriptions s2 WHERE s2.user_id = auth.uid()),
    (SELECT st.parent_id FROM public.students st WHERE st.user_id = auth.uid()),
    (SELECT cg.parent_id FROM public.co_guardians cg
       JOIN public.subscriptions s3 ON s3.user_id = cg.parent_id
      WHERE cg.guardian_id = auth.uid()
      ORDER BY (s3.status IN ('active', 'trialing')) DESC, cg.invited_at
      LIMIT 1)
  )
$$;

-- Rollback:
--   DROP FUNCTION public.get_my_co_guardians();
--   restore get_my_effective_subscription without the 3rd COALESCE branch;
--   DROP POLICY "parent reads co_guardians" / "parent revokes co_guardians" ON co_guardians;
--   CREATE POLICY "parent manages co_guardians" ON public.co_guardians FOR ALL USING (parent_id = auth.uid());
--   DROP POLICY "parent reads guardian_invites" / "parent revokes guardian_invites" ON guardian_invites;
--   CREATE POLICY "parent manages guardian_invites" ON public.guardian_invites FOR ALL USING (parent_id = auth.uid());
--   DROP INDEX public.guardian_invites_one_pending_per_email;
--   ALTER TABLE public.guardian_invites DROP COLUMN accepted_by, DROP COLUMN accepted_at;
--   GRANT ALL ON public.co_guardians, public.guardian_invites TO anon;
