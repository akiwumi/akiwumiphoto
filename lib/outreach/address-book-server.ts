import { createServerClient } from '@/lib/supabase-server';
import { ADDRESS_BOOK, addressBookCountry, type AddressBookContact } from './address-book';

function categoryJoin(row: unknown): { id: string | null; name: string | null } {
  const relation = typeof row === 'object' && row !== null && 'outreach_contact_categories' in row
    ? (row as { outreach_contact_categories?: unknown }).outreach_contact_categories
    : null;
  const category = Array.isArray(relation) ? relation[0] : relation;
  if (typeof category !== 'object' || category === null) return { id: null, name: null };
  const value = category as { id?: unknown; name?: unknown };
  return { id: typeof value.id === 'string' ? value.id : null, name: typeof value.name === 'string' && value.name.trim() ? value.name.trim() : null };
}

export async function getAddressBook(): Promise<AddressBookContact[]> {
  try {
    const client = await createServerClient();
    const result = await client.from('outreach_contacts').select('id,email,first_name,last_name,company_name,city,country,website,source,approved_for_outreach,contact_status,suppressed_at,notes,category_id,outreach_contact_categories(id,name)').order('created_at', { ascending: true });
    if (result.error || !result.data?.length) return ADDRESS_BOOK;
    return result.data.map((row) => {
      const category = categoryJoin(row);
      return {
      id: row.id,
      country: addressBookCountry(row.country),
      categoryId: typeof row.category_id === 'string' ? row.category_id : category.id,
      category: category.name,
      studio: row.company_name || 'Unassigned studio',
      name: [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email,
      role: row.notes?.match(/Role:\s*([^·]+)/i)?.[1]?.trim() || 'Imported contact',
      designerEmail: row.email,
      studioEmail: row.email,
      email: row.email,
      website: row.website || '#',
      source: row.source || 'Supabase address book',
      approvedForOutreach: Boolean(row.approved_for_outreach),
      outreachStatus: 'not contacted',
      replied: ['replied', 'follow_up', 'converted'].includes(row.contact_status),
      suppressed: Boolean(row.suppressed_at) || row.contact_status === 'suppressed',
      };
    });
  } catch {
    return ADDRESS_BOOK;
  }
}
