
-- Drop the unique constraint on token
ALTER TABLE public.guardian_invites DROP CONSTRAINT IF EXISTS guardian_invites_token_key;

-- Drop NOT NULL on token first
ALTER TABLE public.guardian_invites ALTER COLUMN token DROP NOT NULL;
ALTER TABLE public.guardian_invites ALTER COLUMN token DROP DEFAULT;
ALTER TABLE public.guardian_invites ALTER COLUMN token SET DEFAULT NULL;

-- Hash any existing pending invites that have plaintext tokens but no hash
UPDATE public.guardian_invites
SET token_hash = encode(sha256(token::bytea), 'hex'),
    token = NULL
WHERE token IS NOT NULL
  AND token <> 'REDACTED'
  AND (token_hash IS NULL OR token_hash = '');

-- Clear REDACTED placeholders
UPDATE public.guardian_invites SET token = NULL WHERE token = 'REDACTED';

-- Set remaining NULL token_hash rows to placeholder
UPDATE public.guardian_invites SET token_hash = 'legacy-no-hash' WHERE token_hash IS NULL;

-- Make token_hash NOT NULL
ALTER TABLE public.guardian_invites ALTER COLUMN token_hash SET NOT NULL;
