
-- Grace-period token migration: backfill token_hash from plaintext token,
-- so accept/verify functions can switch to hash-based lookup without
-- invalidating the 23 pending beta invites or any live telegram-link tokens.

-- beta_invites: hash existing plaintext tokens (SHA-256 hex)
UPDATE public.beta_invites
SET token_hash = encode(extensions.digest(token, 'sha256'), 'hex')
WHERE token_hash IS NULL AND token IS NOT NULL;

-- telegram_link_tokens: same backfill
UPDATE public.telegram_link_tokens
SET token_hash = encode(extensions.digest(token, 'sha256'), 'hex')
WHERE token_hash IS NULL AND token IS NOT NULL;

-- Auto-hash on future inserts via trigger so all new tokens have a hash
-- even before the plaintext column is dropped.
CREATE OR REPLACE FUNCTION public.set_token_hash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.token IS NOT NULL AND (NEW.token_hash IS NULL OR NEW.token_hash = '') THEN
    NEW.token_hash := encode(extensions.digest(NEW.token, 'sha256'), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_beta_invites_hash ON public.beta_invites;
CREATE TRIGGER trg_beta_invites_hash
  BEFORE INSERT OR UPDATE OF token ON public.beta_invites
  FOR EACH ROW EXECUTE FUNCTION public.set_token_hash();

DROP TRIGGER IF EXISTS trg_telegram_tokens_hash ON public.telegram_link_tokens;
CREATE TRIGGER trg_telegram_tokens_hash
  BEFORE INSERT OR UPDATE OF token ON public.telegram_link_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_token_hash();
