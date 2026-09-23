create table if not exists public.outreach_contact_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists outreach_contact_categories_name_key
  on public.outreach_contact_categories (lower(btrim(name)));

alter table public.outreach_contacts
  add column if not exists category_id uuid references public.outreach_contact_categories(id) on delete set null;

create index if not exists outreach_contacts_category_idx
  on public.outreach_contacts (category_id, country, contact_status);

alter table public.outreach_contact_categories enable row level security;
drop policy if exists outreach_admin_all on public.outreach_contact_categories;
create policy outreach_admin_all on public.outreach_contact_categories
  for all using (public.outreach_is_admin()) with check (public.outreach_is_admin());
