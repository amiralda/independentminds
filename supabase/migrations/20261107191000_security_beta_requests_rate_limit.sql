-- Security audit 7 Doors 2026-11-07 (MEDIUM, Door 6).
-- beta_requests accepts anonymous INSERT (policy "public submits request",
-- with_check true) with no limit, so a script can flood it with junk.
-- Additive fix: a BEFORE INSERT trigger that caps
--   * one request per email per 24 hours
--   * 20 requests per hour across the whole table
--   * basic field lengths
-- The public form keeps working; only floods are refused (SQLSTATE P0001).

create or replace function public.beta_requests_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if length(coalesce(new.email, '')) > 320
     or length(coalesce(new.name, '')) > 200
     or length(coalesce(new.motivation, '')) > 4000 then
    raise exception 'beta_request_too_long' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.beta_requests b
    where lower(b.email) = lower(new.email)
      and b.created_at > now() - interval '24 hours'
  ) then
    raise exception 'beta_request_rate_limited' using errcode = 'P0001';
  end if;

  if (select count(*) from public.beta_requests b
      where b.created_at > now() - interval '1 hour') >= 20 then
    raise exception 'beta_request_rate_limited' using errcode = 'P0001';
  end if;

  -- Status and review fields are never set by the public form.
  new.status := 'pending';
  new.reviewed_by := null;
  new.reviewed_at := null;
  new.created_at := now();
  return new;
end;
$$;

revoke all on function public.beta_requests_rate_limit() from public, anon, authenticated;

drop trigger if exists beta_requests_rate_limit on public.beta_requests;
create trigger beta_requests_rate_limit
  before insert on public.beta_requests
  for each row execute function public.beta_requests_rate_limit();

-- UNDO:
-- drop trigger if exists beta_requests_rate_limit on public.beta_requests;
-- drop function if exists public.beta_requests_rate_limit();
