
-- 1. Fix the overly permissive profiles INSERT policy
-- Drop the old policy that allows anyone to insert
DROP POLICY IF EXISTS "Allow insert for auth trigger" ON public.profiles;

-- Create a new INSERT policy that only allows users to insert their own profile row
-- The auth trigger runs as SECURITY DEFINER so it bypasses RLS entirely
-- This policy allows authenticated users to only insert a row where id = their auth.uid()
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 2. Harden the handle_new_user trigger to always default role to 'parent'
-- Students are created via admin API, never via self-signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role, student_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'User'),
    'parent',
    NULL
  );
  RETURN NEW;
END;
$$;
