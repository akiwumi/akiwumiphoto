-- Consent-gated, privacy-minimized first-party analytics events.
create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (event_name in (
    'page_view', 'gallery_view', 'image_open', 'contact_submit',
    'product_view', 'basket_add', 'basket_remove', 'checkout_start',
    'payment_success', 'payment_failure', 'registration_complete'
  )),
  occurred_at timestamptz not null default now(),
  visitor_hash text not null check (length(visitor_hash) between 32 and 128),
  session_id text not null check (length(session_id) between 16 and 128),
  path text not null check (length(path) between 1 and 512 and left(path, 1) = '/' and position('?' in path) = 0),
  referrer_origin text check (referrer_origin is null or length(referrer_origin) between 1 and 255),
  device_class text not null default 'unknown' check (device_class in ('desktop', 'mobile', 'tablet', 'unknown')),
  country text check (country is null or length(country) between 2 and 3),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  dedupe_key text unique check (dedupe_key is null or length(dedupe_key) between 8 and 256),
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_occurred_at_idx
  on public.analytics_events (occurred_at);
create index if not exists analytics_events_event_name_occurred_at_idx
  on public.analytics_events (event_name, occurred_at);
create index if not exists analytics_events_visitor_hash_occurred_at_idx
  on public.analytics_events (visitor_hash, occurred_at);
create index if not exists analytics_events_path_occurred_at_idx
  on public.analytics_events (path, occurred_at);

alter table public.analytics_events enable row level security;
revoke all on table public.analytics_events from anon, authenticated;

-- No browser role receives a direct table policy. Ingestion uses the server-side
-- service role, and reporting uses the admin-only function below.
create or replace function public.get_analytics_summary(
  start_at timestamptz,
  end_at timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  range_start timestamptz;
  range_end timestamptz;
begin
  if coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'Admin required' using errcode = '42501';
  end if;

  range_end := least(coalesce(end_at, now()), now());
  range_start := coalesce(start_at, range_end - interval '30 days');

  -- Keep reports bounded, and make an inverted/empty range return no rows.
  if range_start < range_end - interval '366 days' then
    range_start := range_end - interval '366 days';
  end if;

  return jsonb_build_object(
    'range_start', range_start,
    'range_end', range_end,
    'headline', jsonb_build_object(
      'unique_visitors', (select count(distinct visitor_hash) from public.analytics_events where occurred_at >= range_start and occurred_at < range_end),
      'sessions', (select count(distinct session_id) from public.analytics_events where occurred_at >= range_start and occurred_at < range_end),
      'page_views', (select count(*) from public.analytics_events where event_name = 'page_view' and occurred_at >= range_start and occurred_at < range_end),
      'contact_submissions', (select count(*) from public.analytics_events where event_name = 'contact_submit' and occurred_at >= range_start and occurred_at < range_end),
      'checkout_starts', (select count(*) from public.analytics_events where event_name = 'checkout_start' and occurred_at >= range_start and occurred_at < range_end),
      'completed_payments', (select count(*) from public.analytics_events where event_name = 'payment_success' and occurred_at >= range_start and occurred_at < range_end),
      'registrations', (select count(*) from public.analytics_events where event_name = 'registration_complete' and occurred_at >= range_start and occurred_at < range_end)
    ),
    'daily', coalesce((select jsonb_agg(to_jsonb(d) order by d.day)
      from (
        select occurred_at::date as day,
               count(distinct visitor_hash) as unique_visitors,
               count(distinct session_id) as sessions,
               count(*) filter (where event_name = 'page_view') as page_views
        from public.analytics_events
        where occurred_at >= range_start and occurred_at < range_end
        group by occurred_at::date
      ) d), '[]'::jsonb),
    'top_pages', coalesce((select jsonb_agg(to_jsonb(p) order by p.events desc, p.path)
      from (
        select path, count(*) as events
        from public.analytics_events
        where event_name = 'page_view' and occurred_at >= range_start and occurred_at < range_end
        group by path
        order by events desc, path
        limit 10
      ) p), '[]'::jsonb),
    'top_referrers', coalesce((select jsonb_agg(to_jsonb(r) order by r.events desc, r.referrer_origin)
      from (
        select referrer_origin, count(*) as events
        from public.analytics_events
        where event_name = 'page_view' and referrer_origin is not null and occurred_at >= range_start and occurred_at < range_end
        group by referrer_origin
        order by events desc, referrer_origin
        limit 10
      ) r), '[]'::jsonb),
    'top_devices', coalesce((select jsonb_agg(to_jsonb(v) order by v.events desc, v.device_class)
      from (
        select device_class, count(*) as events
        from public.analytics_events
        where event_name = 'page_view' and occurred_at >= range_start and occurred_at < range_end
        group by device_class
        order by events desc, device_class
        limit 10
      ) v), '[]'::jsonb),
    'funnels', jsonb_build_object(
      'visit_to_gallery', jsonb_build_object(
        'visits', (select count(distinct session_id) from public.analytics_events where event_name = 'page_view' and occurred_at >= range_start and occurred_at < range_end),
        'gallery_interactions', (select count(distinct session_id) from public.analytics_events where event_name in ('gallery_view', 'image_open') and occurred_at >= range_start and occurred_at < range_end)
      ),
      'gallery_to_paid', jsonb_build_object(
        'visits', (select count(*) from (select session_id from public.analytics_events where event_name = 'page_view' and occurred_at >= range_start and occurred_at < range_end group by session_id) s),
        'gallery_interactions', (select count(*) from (select session_id from public.analytics_events where event_name = 'page_view' and occurred_at >= range_start and occurred_at < range_end group by session_id) v where exists (select 1 from public.analytics_events g where g.session_id = v.session_id and g.event_name in ('gallery_view', 'image_open') and g.occurred_at >= range_start and g.occurred_at < range_end)),
        'checkout_starts', (select count(*) from (select session_id, min(occurred_at) as gallery_at from public.analytics_events where event_name in ('gallery_view', 'image_open') and occurred_at >= range_start and occurred_at < range_end group by session_id) g where exists (select 1 from public.analytics_events p where p.session_id = g.session_id and p.event_name = 'page_view' and p.occurred_at >= range_start and p.occurred_at < g.gallery_at) and exists (select 1 from public.analytics_events c where c.session_id = g.session_id and c.event_name = 'checkout_start' and c.occurred_at >= g.gallery_at and c.occurred_at < range_end)),
        'paid_orders', (select count(*) from (select session_id, min(occurred_at) as gallery_at from public.analytics_events where event_name in ('gallery_view', 'image_open') and occurred_at >= range_start and occurred_at < range_end group by session_id) g where exists (select 1 from public.analytics_events p where p.session_id = g.session_id and p.event_name = 'page_view' and p.occurred_at >= range_start and p.occurred_at < g.gallery_at) and exists (select 1 from public.analytics_events c where c.session_id = g.session_id and c.event_name = 'checkout_start' and c.occurred_at >= g.gallery_at and c.occurred_at < range_end) and exists (select 1 from public.analytics_events paid where paid.session_id = g.session_id and paid.event_name = 'payment_success' and paid.occurred_at >= g.gallery_at and paid.occurred_at < range_end))
      ),
      'visit_to_registration', jsonb_build_object(
        'visits', (select count(distinct session_id) from public.analytics_events where event_name = 'page_view' and occurred_at >= range_start and occurred_at < range_end),
        'registrations', (select count(distinct session_id) from public.analytics_events where event_name = 'registration_complete' and occurred_at >= range_start and occurred_at < range_end)
      )
    )
  );
end;
$$;

revoke all on function public.get_analytics_summary(timestamptz, timestamptz) from public, anon;
grant execute on function public.get_analytics_summary(timestamptz, timestamptz) to authenticated;

-- Shared, atomic ingestion throttling across all application instances.
create table public.analytics_rate_limits (
  bucket text primary key check (length(bucket) between 1 and 256),
  window_start timestamptz not null,
  request_count integer not null check (request_count >= 0),
  updated_at timestamptz not null default now()
);
alter table public.analytics_rate_limits enable row level security;
revoke all on table public.analytics_rate_limits from public, anon, authenticated;

create or replace function public.consume_analytics_rate_limit(
  p_bucket text,
  p_max_requests integer,
  p_window_start timestamptz
)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  if p_bucket is null or length(p_bucket) = 0 or p_max_requests < 1 or p_max_requests > 10000 or p_window_start is null then
    return false;
  end if;
  insert into public.analytics_rate_limits(bucket, window_start, request_count, updated_at)
  values (p_bucket, p_window_start, 1, now())
  on conflict (bucket) do update set
    window_start = case when analytics_rate_limits.window_start < excluded.window_start then excluded.window_start else analytics_rate_limits.window_start end,
    request_count = case when analytics_rate_limits.window_start < excluded.window_start then 1 else analytics_rate_limits.request_count + 1 end,
    updated_at = now()
  returning request_count into current_count;
  return current_count <= p_max_requests;
end;
$$;
revoke all on function public.consume_analytics_rate_limit(text, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.consume_analytics_rate_limit(text, integer, timestamptz) to service_role;
