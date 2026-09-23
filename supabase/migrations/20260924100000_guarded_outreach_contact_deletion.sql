-- Contact removal must never cascade into the outreach history. The RPC below
-- locks candidates and re-checks delivery references in the same transaction.
create or replace function public.outreach_delete_contacts_guarded(
  p_contact_ids uuid[] default null,
  p_category_id uuid default null
)
returns table (
  deleted_contact_ids uuid[],
  protected_contact_ids uuid[],
  deleted_count integer,
  protected_count integer,
  category_deleted boolean,
  requested_count integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  candidate_ids uuid[] := '{}';
  deleted_ids uuid[] := '{}';
  protected_ids uuid[] := '{}';
  did_delete_category boolean := false;
begin
  if not public.outreach_is_admin() then
    raise exception 'not authorized';
  end if;
  if p_contact_ids is null and p_category_id is null then
    raise exception 'contact ids or category id required';
  end if;
  if p_contact_ids is not null and p_category_id is not null then
    raise exception 'contact ids and category id are mutually exclusive';
  end if;

  if p_category_id is not null then
    perform 1 from public.outreach_contact_categories
      where id = p_category_id
      FOR UPDATE;
    if not found then
      raise exception 'category not found';
    end if;
    select coalesce(array_agg(id order by id), '{}') into candidate_ids
    from (
      select id from public.outreach_contacts
      where category_id = p_category_id
      FOR UPDATE
    ) locked_contacts;
  else
    select coalesce(array_agg(id order by id), '{}') into candidate_ids
    from (
      select id from public.outreach_contacts
      where id = any(coalesce(p_contact_ids, '{}'))
      FOR UPDATE
    ) locked_contacts;
  end if;

  select coalesce(array_agg(contact_id order by contact_id), '{}') into protected_ids
  from (
    select distinct contact_id
    from public.outreach_deliveries
    where contact_id = any(candidate_ids)
  ) protected_deliveries;

  with deleted as (
    delete from public.outreach_contacts contact
    where contact.id = any(candidate_ids)
      and NOT EXISTS (
        SELECT 1
        FROM public.outreach_deliveries delivery
        where delivery.contact_id = contact.id
      )
    returning contact.id
  )
  select coalesce(array_agg(id order by id), '{}') into deleted_ids from deleted;

  if p_category_id is not null and not exists (
    select 1 from public.outreach_contacts where category_id = p_category_id
  ) then
    delete from public.outreach_contact_categories
    where id = p_category_id;
    did_delete_category := found;
  end if;

  return query select deleted_ids, protected_ids, cardinality(deleted_ids), cardinality(protected_ids), did_delete_category, cardinality(candidate_ids);
end;
$$;

revoke execute on function public.outreach_delete_contacts_guarded(uuid[], uuid[]) from public;
grant execute on function public.outreach_delete_contacts_guarded(uuid[], uuid[]) to authenticated;
