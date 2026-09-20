import type { AddressBookContact } from './address-book';

export const CONTACT_OVERRIDES_STORAGE_KEY = 'akiwumi-outreach-contact-overrides';

export interface ContactExtraField {
  id: string;
  label: string;
  value: string;
}

export interface ContactOverride {
  contactId: string;
  name?: string;
  studio?: string;
  role?: string;
  email?: string;
  country?: AddressBookContact['country'];
  website?: string;
  phone?: string;
  notes?: string;
  otherEmails?: string[];
  extras?: ContactExtraField[];
}

export function applyContactOverride(contact: AddressBookContact, override?: ContactOverride): AddressBookContact {
  if (!override) return contact;
  const email = override.email?.trim().toLowerCase() || contact.email;
  return { ...contact, name: override.name?.trim() || contact.name, studio: override.studio?.trim() || contact.studio, role: override.role?.trim() || contact.role, email, designerEmail: email, studioEmail: email, country: override.country ?? contact.country, website: override.website ?? contact.website };
}

export function contactOverrideMap(value: unknown): Record<string, ContactOverride> {
  if (!Array.isArray(value)) return {};
  return value.reduce<Record<string, ContactOverride>>((map, entry) => {
    if (entry && typeof entry === 'object' && typeof entry.contactId === 'string') map[entry.contactId] = entry as ContactOverride;
    return map;
  }, {});
}
