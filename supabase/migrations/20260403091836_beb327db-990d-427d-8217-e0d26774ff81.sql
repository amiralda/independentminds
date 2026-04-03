
CREATE TABLE public.telegram_link_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  chat_id bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '15 minutes',
  used boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_telegram_link_tokens_token ON public.telegram_link_tokens (token);
CREATE INDEX idx_telegram_link_tokens_user ON public.telegram_link_tokens (user_id);

ALTER TABLE public.telegram_link_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own link tokens"
ON public.telegram_link_tokens FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
