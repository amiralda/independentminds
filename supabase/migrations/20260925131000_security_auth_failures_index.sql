-- Security audit 2026-09-25: track-auth-failure now counts recent rows per
-- masked IP before inserting (flood cap); index that lookup. Additive.
CREATE INDEX IF NOT EXISTS idx_auth_failures_ip_created
  ON public.auth_failures (ip_hint, created_at DESC);

-- Rollback: DROP INDEX public.idx_auth_failures_ip_created;
