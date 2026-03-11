
-- Fix security definer view by explicitly setting SECURITY INVOKER
DROP VIEW IF EXISTS public.student_safe_view;

CREATE VIEW public.student_safe_view
WITH (security_invoker = true)
AS
  SELECT student_id, display_name, grade_level, language_pref, timezone
  FROM public.students;
