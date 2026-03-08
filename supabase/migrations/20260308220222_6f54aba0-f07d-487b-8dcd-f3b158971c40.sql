
-- Lock down profile INSERT: force default role and null student_id
-- The handle_new_user() trigger creates profiles, but if someone bypasses it,
-- they shouldn't be able to set arbitrary role or student_id
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND role = 'parent'
    AND student_id IS NULL
  );
