CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  generated_username text;
  resolved_name text;
BEGIN
  -- COPPA: reject signups without adult confirmation
  IF COALESCE((NEW.raw_user_meta_data->>'adult_confirmed')::boolean, FALSE) IS NOT TRUE THEN
    RAISE EXCEPTION 'Adult confirmation required for registration (COPPA compliance)';
  END IF;

  resolved_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    'User'
  );

  generated_username := public.generate_username(resolved_name);
  
  INSERT INTO public.profiles (id, display_name, username, role, student_id, adult_confirmed, adult_confirmed_at, onboarding_step)
  VALUES (
    NEW.id,
    resolved_name,
    generated_username,
    'parent',
    NULL,
    TRUE,
    COALESCE((NEW.raw_user_meta_data->>'adult_confirmed_at')::timestamptz, NOW()),
    1
  );
  RETURN NEW;
END;
$function$;