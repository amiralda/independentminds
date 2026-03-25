
-- Add username column to profiles
ALTER TABLE public.profiles ADD COLUMN username text UNIQUE;

-- Function to generate a username from display_name: FirstnameL-XXXXX
CREATE OR REPLACE FUNCTION public.generate_username(p_display_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  parts text[];
  first_name text;
  last_initial text;
  base_name text;
  candidate text;
  attempts int := 0;
BEGIN
  parts := string_to_array(trim(p_display_name), ' ');
  first_name := COALESCE(parts[1], 'User');
  
  IF array_length(parts, 1) > 1 THEN
    last_initial := upper(left(parts[array_length(parts, 1)], 1));
    base_name := initcap(first_name) || last_initial;
  ELSE
    base_name := initcap(first_name);
  END IF;
  
  LOOP
    candidate := base_name || '-' || lpad((floor(random() * 90000 + 10000))::text, 5, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate);
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Could not generate unique username after 100 attempts';
    END IF;
  END LOOP;
  
  RETURN candidate;
END;
$$;

-- Generate usernames for all existing profiles that don't have one
UPDATE public.profiles 
SET username = public.generate_username(display_name) 
WHERE username IS NULL;

-- Make username NOT NULL now that all rows have values
ALTER TABLE public.profiles ALTER COLUMN username SET NOT NULL;

-- Update handle_new_user to auto-generate username on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  generated_username text;
BEGIN
  generated_username := public.generate_username(
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'User')
  );
  
  INSERT INTO public.profiles (id, display_name, username, role, student_id, adult_confirmed, adult_confirmed_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'User'),
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
$$;
