-- Expose whether reporting has any persisted events without granting table access.
create or replace function public.has_analytics_events()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'Admin required' using errcode = '42501';
  end if;
  return exists(select 1 from public.analytics_events);
end;
$$;

revoke all on function public.has_analytics_events() from public, anon;
grant execute on function public.has_analytics_events() to authenticated;
