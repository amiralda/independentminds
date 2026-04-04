CREATE OR REPLACE FUNCTION public.notify_n8n_new_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_email text;
BEGIN
  SELECT au.email INTO user_email
  FROM auth.users AS au
  WHERE au.id = NEW.id;

  PERFORM net.http_post(
    url := 'https://amiralda.app.n8n.cloud/webhook/0124d508-3176-4716-bc87-6e67f842c470',
    body := jsonb_build_object(
      'user_id', NEW.id,
      'full_name', NEW.display_name,
      'email', COALESCE(user_email, ''),
      'preferred_language', NEW.language_pref,
      'created_at', NEW.created_at
    ),
    headers := jsonb_build_object('Content-Type', 'application/json')
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'notify_n8n_new_signup failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;