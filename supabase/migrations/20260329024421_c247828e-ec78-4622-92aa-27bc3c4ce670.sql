-- Drop the overly permissive co-guardian policy
DROP POLICY IF EXISTS co_guardian_reads_students ON public.students;

-- Create a security definer function that filters PII based on permissions
CREATE OR REPLACE FUNCTION public.get_co_guardian_students(_guardian_id uuid)
RETURNS TABLE (
  student_id text,
  display_name text,
  grade_level integer,
  parent_id uuid,
  language_pref text,
  timezone text,
  profile_photo_url text,
  monitoring_enabled boolean,
  academic_year text,
  created_at timestamptz,
  updated_at timestamptz,
  -- PII columns: only returned for is_full_access
  date_of_birth date,
  parent_email text,
  parent_name text,
  parent_whatsapp text,
  student_whatsapp text,
  nationality text,
  address text,
  enrollment_date date
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
    s.parent_id,
    s.language_pref,
    s.timezone,
    s.profile_photo_url,
    s.monitoring_enabled,
    s.academic_year,
    s.created_at,
    s.updated_at,
    -- PII: only expose for full-access co-guardians
    CASE WHEN cg.is_full_access THEN s.date_of_birth ELSE NULL END,
    CASE WHEN cg.is_full_access THEN s.parent_email ELSE NULL END,
    CASE WHEN cg.is_full_access THEN s.parent_name ELSE NULL END,
    CASE WHEN cg.is_full_access THEN s.parent_whatsapp ELSE NULL END,
    CASE WHEN cg.is_full_access THEN s.student_whatsapp ELSE NULL END,
    CASE WHEN cg.is_full_access THEN s.nationality ELSE NULL END,
    CASE WHEN cg.is_full_access THEN s.address ELSE NULL END,
    CASE WHEN cg.is_full_access THEN s.enrollment_date ELSE NULL END
  FROM public.students s
  JOIN public.co_guardians cg ON cg.student_id = s.student_id
  WHERE cg.guardian_id = _guardian_id;
$$;