
-- 1. Create a security definer function for student self-access (masks PII)
CREATE OR REPLACE FUNCTION public.get_my_student_record()
RETURNS TABLE (
  student_id text,
  display_name text,
  grade_level integer,
  language_pref text,
  timezone text,
  profile_photo_url text,
  monitoring_enabled boolean,
  academic_year text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    s.student_id,
    s.display_name,
    s.grade_level,
    s.language_pref,
    s.timezone,
    s.profile_photo_url,
    s.monitoring_enabled,
    s.academic_year,
    s.created_at,
    s.updated_at
  FROM public.students s
  WHERE s.student_id = (SELECT p.student_id FROM public.profiles p WHERE p.id = auth.uid());
$$;

-- 2. Drop the overly permissive student SELECT policy
DROP POLICY IF EXISTS students_select_student ON public.students;

-- 3. Add a trigger to prevent role/student_id changes on profiles
CREATE OR REPLACE FUNCTION public.guard_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Cannot modify role via profile update';
  END IF;
  IF NEW.student_id IS DISTINCT FROM OLD.student_id THEN
    RAISE EXCEPTION 'Cannot modify student_id via profile update';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_role_change ON public.profiles;
CREATE TRIGGER trg_guard_profile_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_role_change();
