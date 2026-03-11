-- Fix: Remove client-side INSERT policy on messages_log (only service role should write)
DROP POLICY IF EXISTS "messages_log_insert" ON public.messages_log;