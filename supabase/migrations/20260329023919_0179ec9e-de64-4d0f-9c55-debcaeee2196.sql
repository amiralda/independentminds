-- Restrict inbox_messages UPDATE to only read-status columns
REVOKE UPDATE ON public.inbox_messages FROM authenticated;
GRANT UPDATE (is_read, read_at) ON public.inbox_messages TO authenticated;