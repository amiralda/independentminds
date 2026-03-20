-- Fix 1: Block DELETE/UPDATE on rate_limits for authenticated users
CREATE POLICY "Block client update on rate_limits" ON rate_limits FOR UPDATE USING (false);
CREATE POLICY "Block client delete on rate_limits" ON rate_limits FOR DELETE USING (false);

-- Fix 2: Block UPDATE/DELETE on messages_log for authenticated users
CREATE POLICY "Block client update on messages_log" ON messages_log FOR UPDATE USING (false);
CREATE POLICY "Block client delete on messages_log" ON messages_log FOR DELETE USING (false);