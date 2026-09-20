import { createServerClient } from '@/lib/supabase-server';
import { ADDRESS_BOOK, type AddressBookContact } from './address-book';

function countryFor(value: string | null): AddressBookContact['country'] {
  return value === 'Denmark' || value === 'Norway' ? value : 'Sweden';
}

export async function getAddressBook(): Promise<AddressBookContact[]> {
  try {
    const client = await createServerClient();
    const result = await client.from('outreach_contacts').select('id,email,first_name,last_name,company_name,city,country,website,source,approved_for_outreach,contact_status,suppressed_at,notes').order('created_at', { ascending: true });
    if (result.error || !result.data?.length) return ADDRESS_BOOK;
    return result.data.map((row) => ({
      id: row.id,
      country: countryFor(row.country),
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
    }));
  } catch {
    return ADDRESS_BOOK;
  }
}
