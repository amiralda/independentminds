
-- Add user_id column to messages_log for tenant scoping
ALTER TABLE public.messages_log ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Drop old permissive/restrictive SELECT and INSERT policies
DROP POLICY IF EXISTS "messages_log_select" ON public.messages_log;
DROP POLICY IF EXISTS "messages_log_insert" ON public.messages_log;

-- New SELECT policy: only see your own messages
CREATE POLICY "messages_log_select" ON public.messages_log
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- New INSERT policy: can only insert rows with your own user_id
CREATE POLICY "messages_log_insert" ON public.messages_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
