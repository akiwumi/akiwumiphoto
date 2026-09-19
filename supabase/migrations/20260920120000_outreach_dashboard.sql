create table if not exists public.outreach_import_batches (
  id uuid primary key default gen_random_uuid(), filename text not null, source_label text,
  row_count integer not null default 0, imported_count integer not null default 0,
  duplicate_count integer not null default 0, invalid_count integer not null default 0,
  created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.outreach_contacts (
  id uuid primary key default gen_random_uuid(), email text not null unique,
  first_name text, last_name text, company_name text, city text, country text, website text,
  source text, source_url text, notes text, approved_for_outreach boolean not null default false,
  contact_status text not null default 'imported' check (contact_status in ('imported','needs_review','approved','replied','follow_up','converted','not_interested','suppressed')),
  suppressed_at timestamptz, suppression_reason text, replied_at timestamptz, follow_up_at timestamptz,
  import_batch_id uuid references public.outreach_import_batches(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.outreach_campaigns (
  id uuid primary key default gen_random_uuid(), name text not null, description text,
  subject text not null, preheader text, html_template text not null, text_template text not null,
  from_name text not null, from_email text not null, reply_to_email text not null,
  status text not null default 'draft' check (status in ('draft','testing','queued','sending','paused','completed','cancelled')),
  scheduled_at timestamptz, started_at timestamptz, completed_at timestamptz,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.outreach_deliveries (
  id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.outreach_campaigns(id) on delete cascade,
  contact_id uuid not null references public.outreach_contacts(id) on delete cascade, provider_message_id text,
  status text not null default 'queued' check (status in ('queued','submitted','delivered','opened','clicked','bounced','failed','unsubscribed')),
  rendered_subject text, sent_at timestamptz, delivered_at timestamptz, opened_at timestamptz, clicked_at timestamptz, bounced_at timestamptz,
  error_message text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(campaign_id, contact_id)
);
create table if not exists public.outreach_events (
  id uuid primary key default gen_random_uuid(), delivery_id uuid not null references public.outreach_deliveries(id) on delete cascade,
  provider_event_id text unique, event_type text not null, payload_json jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null, created_at timestamptz not null default now()
);
create table if not exists public.outreach_contact_notes (
  id uuid primary key default gen_random_uuid(), contact_id uuid not null references public.outreach_contacts(id) on delete cascade,
  body text not null, created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.outreach_audit_log (
  id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id), action text not null,
  entity_type text not null, entity_id uuid, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists outreach_contacts_status_idx on public.outreach_contacts(contact_status, country, city);
create index if not exists outreach_deliveries_campaign_idx on public.outreach_deliveries(campaign_id, status);
create or replace function public.outreach_is_admin() returns boolean language sql stable security definer set search_path = public as $$ select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false) $$;
do $$ declare table_name text; begin foreach table_name in array array['outreach_import_batches','outreach_contacts','outreach_campaigns','outreach_deliveries','outreach_events','outreach_contact_notes','outreach_audit_log'] loop execute format('alter table public.%I enable row level security', table_name); execute format('drop policy if exists outreach_admin_all on public.%I', table_name); execute format('create policy outreach_admin_all on public.%I for all using (public.outreach_is_admin()) with check (public.outreach_is_admin())', table_name); end loop; end $$;

