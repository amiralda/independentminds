-- Drop the legacy plaintext token column — only token_hash is used
ALTER TABLE public.guardian_invites DROP COLUMN IF EXISTS token;
