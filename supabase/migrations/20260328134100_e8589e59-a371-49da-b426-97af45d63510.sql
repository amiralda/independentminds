
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
  resolved_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    'User'
  );

  generated_username := public.generate_username(resolved_name);
  
  INSERT INTO public.profiles (id, display_name, username, role, student_id, adult_confirmed, adult_confirmed_at)
  VALUES (
    NEW.id,
    resolved_name,
    generated_username,
    'parent',
    NULL,
    COALESCE((NEW.raw_user_meta_data->>'adult_confirmed')::boolean, FALSE),
    CASE WHEN (NEW.raw_user_meta_data->>'adult_confirmed')::boolean = TRUE
      THEN COALESCE((NEW.raw_user_meta_data->>'adult_confirmed_at')::timestamptz, NOW())
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$function$
