
-- Enable pg_net for HTTP requests from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create the trigger function
CREATE OR REPLACE FUNCTION public.notify_n8n_new_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_email text;
BEGIN
  -- Get email from auth.users
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.id;

  -- POST to n8n webhook
  PERFORM extensions.http_post(
    url := 'https://amiralda.app.n8n.cloud/webhook/0124d508-3176-4716-bc87-6e67f842c470',
    body := jsonb_build_object(
      'user_id', NEW.id,
      'full_name', NEW.display_name,
      'email', COALESCE(user_email, ''),
      'preferred_language', NEW.language_pref,
      'created_at', NEW.created_at
    )::text,
    headers := jsonb_build_object('Content-Type', 'application/json')
  );

  RETURN NEW;
END;
$$;

-- Attach trigger to profiles table
CREATE TRIGGER trg_notify_n8n_new_signup
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.notify_n8n_new_signup();
