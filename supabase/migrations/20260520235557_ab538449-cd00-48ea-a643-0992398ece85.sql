-- Mark stale single-occurrence "object can not be found here" errors as resolved
UPDATE public.platform_errors
SET resolved = true
WHERE resolved = false
  AND created_at < now() - interval '30 days'
  AND error_message ILIKE '%object can not be found here%';