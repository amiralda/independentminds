-- Ensure pg_net is available
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to notify marketing OS webhook
CREATE OR REPLACE FUNCTION public.notify_marketing_os()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  user_email text;
BEGIN
  -- Look up email from auth.users
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.id;

  PERFORM net.http_post(
    url := 'https://amiralda.app.n8n.cloud/webhook/0124d508-3176-4716-bc87-6e67f842c470',
    body := jsonb_build_object(
      'user_id', NEW.id,
      'display_name', NEW.display_name,
      'email', user_email,
      'language_pref', COALESCE(NEW.language_pref, 'EN'),
      'created_at', NEW.created_at
    ),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );

  RETURN NEW;
END;
$$;

-- Drop existing trigger if present, then create
DROP TRIGGER IF EXISTS trg_notify_marketing_os ON public.profiles;

CREATE TRIGGER trg_notify_marketing_os
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.notify_marketing_os();