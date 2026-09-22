-- Retain daily aggregate traffic from Vercel's former consent-gated tracker.
-- The API exposes aggregate counts, not individual browser events.
create table public.analytics_historical_traffic (
  source text not null default 'vercel' check (source = 'vercel'),
  bucket_day date not null,
  dimension text not null check (dimension in ('overview', 'page', 'referrer', 'device')),
  dimension_value text not null default '',
  page_views integer not null default 0 check (page_views >= 0),
  visitors integer not null default 0 check (visitors >= 0),
  imported_at timestamptz not null default now(),
  primary key (source, bucket_day, dimension, dimension_value)
);
alter table public.analytics_historical_traffic enable row level security;
revoke all on table public.analytics_historical_traffic from public, anon, authenticated;
grant select, insert, update on table public.analytics_historical_traffic to service_role;

-- Summarize existing operational records created before consented first-party
-- tracking began. Counts stay separate from visitor/session analytics because
-- historical order and account records cannot be attributed to a browser.
create or replace function public.get_analytics_historical_summary(
  start_at timestamptz,
  end_at timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  range_start timestamptz;
  range_end timestamptz;
  range_end_day date;
  tracking_started_at timestamptz;
  historical_traffic jsonb;
begin
  if coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'Admin required' using errcode = '42501';
  end if;

  range_end := least(coalesce(end_at, now()), now());
  range_start := coalesce(start_at, range_end - interval '30 days');
  range_end_day := (range_end - interval '1 microsecond')::date + 1;
  if range_start < range_end - interval '366 days' then
    range_start := range_end - interval '366 days';
  end if;

  select min(occurred_at) into tracking_started_at from public.analytics_events;

  select jsonb_build_object(
    'page_views', coalesce((select sum(page_views) from public.analytics_historical_traffic where dimension = 'overview' and bucket_day >= range_start::date and bucket_day < range_end_day and (tracking_started_at is null or bucket_day < tracking_started_at::date)), 0),
    'visitor_days', coalesce((select sum(visitors) from public.analytics_historical_traffic where dimension = 'overview' and bucket_day >= range_start::date and bucket_day < range_end_day and (tracking_started_at is null or bucket_day < tracking_started_at::date)), 0),
    'daily', coalesce((select jsonb_agg(to_jsonb(d) order by d.day) from (
      select bucket_day as day, sum(visitors)::integer as unique_visitors, 0::integer as sessions, sum(page_views)::integer as page_views
      from public.analytics_historical_traffic
      where dimension = 'overview' and bucket_day >= range_start::date and bucket_day < range_end_day and (tracking_started_at is null or bucket_day < tracking_started_at::date)
      group by bucket_day
    ) d), '[]'::jsonb),
    'top_pages', coalesce((select jsonb_agg(to_jsonb(p) order by p.events desc, p.path) from (
      select dimension_value as path, sum(page_views)::integer as events
      from public.analytics_historical_traffic
      where dimension = 'page' and bucket_day >= range_start::date and bucket_day < range_end_day and (tracking_started_at is null or bucket_day < tracking_started_at::date)
      group by dimension_value order by events desc, path limit 10
    ) p), '[]'::jsonb),
    'top_referrers', coalesce((select jsonb_agg(to_jsonb(r) order by r.events desc, r.referrer_origin) from (
      select dimension_value as referrer_origin, sum(page_views)::integer as events
      from public.analytics_historical_traffic
      where dimension = 'referrer' and bucket_day >= range_start::date and bucket_day < range_end_day and (tracking_started_at is null or bucket_day < tracking_started_at::date)
      group by dimension_value order by events desc, referrer_origin limit 10
    ) r), '[]'::jsonb),
    'top_devices', coalesce((select jsonb_agg(to_jsonb(v) order by v.events desc, v.device_class) from (
      select dimension_value as device_class, sum(page_views)::integer as events
      from public.analytics_historical_traffic
      where dimension = 'device' and bucket_day >= range_start::date and bucket_day < range_end_day and (tracking_started_at is null or bucket_day < tracking_started_at::date)
      group by dimension_value order by events desc, device_class limit 10
    ) v), '[]'::jsonb)
  ) into historical_traffic;

  return jsonb_build_object(
    'tracking_started_at', tracking_started_at,
    'traffic', historical_traffic,
    'checkout_starts', (
      select count(*) from public.print_orders
      where stripe_session_id is not null
        and created_at >= range_start and created_at < range_end
        and (tracking_started_at is null or created_at < tracking_started_at)
    ),
    'completed_payments', (
      select count(*) from public.print_orders
      where paid_at is not null
        and paid_at >= range_start and paid_at < range_end
        and (tracking_started_at is null or paid_at < tracking_started_at)
    ),
    'registrations', (
      select count(*) from public.collectors
      where verified_at is not null
        and verified_at >= range_start and verified_at < range_end
        and (tracking_started_at is null or verified_at < tracking_started_at)
    )
  );
end;
$$;

revoke all on function public.get_analytics_historical_summary(timestamptz, timestamptz) from public, anon;
grant execute on function public.get_analytics_historical_summary(timestamptz, timestamptz) to authenticated;
