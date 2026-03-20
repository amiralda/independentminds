
-- Update handle_new_user to read adult_confirmed from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role, student_id, adult_confirmed, adult_confirmed_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'User'),
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
$$;
