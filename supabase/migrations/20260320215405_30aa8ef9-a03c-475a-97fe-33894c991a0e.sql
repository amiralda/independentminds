
-- Part 1: Profile extensions
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS adult_confirmed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS adult_confirmed_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reengagement_sent_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deletion_warning_sent_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_step INTEGER NOT NULL DEFAULT 0;

-- Part 1: Parent settings extensions
ALTER TABLE parent_settings ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE parent_settings ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
ALTER TABLE parent_settings ADD COLUMN IF NOT EXISTS notification_channel TEXT NOT NULL DEFAULT 'telegram';

-- Part 1: Rate limits table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  function_name TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, function_name, window_start)
);
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own rate limits" ON rate_limits FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "No direct client insert on rate_limits" ON rate_limits FOR INSERT TO authenticated WITH CHECK (false);

-- Part 1: Flagged inputs table (student_id is TEXT matching students PK)
CREATE TABLE IF NOT EXISTS flagged_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT,
  flagged_at TIMESTAMPTZ DEFAULT NOW(),
  flag_reason TEXT,
  input_length INTEGER
);
ALTER TABLE flagged_inputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No client access to flagged_inputs" ON flagged_inputs FOR ALL TO authenticated USING (false);

-- Part 1: AI conversations table (student_id is TEXT matching students PK)
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT 'general',
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_student_subject ON ai_conversations(student_id, subject, created_at DESC);
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students read own ai_conversations" ON ai_conversations FOR SELECT TO authenticated USING (student_id = get_my_student_id());
CREATE POLICY "Students insert own ai_conversations" ON ai_conversations FOR INSERT TO authenticated WITH CHECK (student_id = get_my_student_id());
CREATE POLICY "Parents read child ai_conversations" ON ai_conversations FOR SELECT TO authenticated USING (is_my_student(student_id));

-- Part 1: Schedule templates table
CREATE TABLE IF NOT EXISTS schedule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL,
  student_id TEXT,
  name TEXT NOT NULL,
  is_builtin BOOLEAN NOT NULL DEFAULT FALSE,
  blocks JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parent owns templates" ON schedule_templates FOR ALL TO authenticated USING (parent_id = auth.uid() OR is_builtin = TRUE) WITH CHECK (parent_id = auth.uid());
CREATE TRIGGER update_schedule_templates_updated_at BEFORE UPDATE ON schedule_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Part 1: Push subscriptions table (student_id is TEXT matching students PK)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  subscription JSONB NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students manage own push subs" ON push_subscriptions FOR ALL TO authenticated USING (student_id = get_my_student_id()) WITH CHECK (student_id = get_my_student_id());

-- Part 1: Rate limit increment RPC
CREATE OR REPLACE FUNCTION increment_rate_limit(p_user_id UUID, p_function_name TEXT, p_window_start TIMESTAMPTZ, p_limit INTEGER)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INTEGER;
BEGIN
  INSERT INTO rate_limits (user_id, function_name, window_start, request_count)
  VALUES (p_user_id, p_function_name, p_window_start, 1)
  ON CONFLICT (user_id, function_name, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1
  RETURNING request_count INTO v_count;
  RETURN json_build_object('count', v_count, 'allowed', v_count <= p_limit);
END; $$;

-- Part 1: Clear AI history RPC (uses TEXT student_id)
CREATE OR REPLACE FUNCTION clear_ai_history(p_student_id TEXT, p_subject TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_my_student(p_student_id) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  DELETE FROM ai_conversations WHERE student_id = p_student_id AND subject = p_subject;
END; $$;

-- Part 1: Delete my account RPC
CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END; $$;
