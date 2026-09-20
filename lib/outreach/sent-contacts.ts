export const SENT_CONTACTS_STORAGE_KEY = 'akiwumi-outreach-sent-contacts';
export const ERASED_CONTACTS_STORAGE_KEY = 'akiwumi-outreach-erased-contact-ids';
export const MANUAL_CONTACTS_STORAGE_KEY = 'akiwumi-outreach-manual-contacts';

export interface SentContactRecord {
  contactId: string;
  email: string;
  sentAt: string;
  providerMessageId?: string;
  subject?: string;
  html?: string;
  text?: string;
}

export function sentContactMap(records: SentContactRecord[]): Record<string, SentContactRecord> {
  return records.reduce<Record<string, SentContactRecord>>((map, record) => {
    map[record.contactId] = record;
    return map;
  }, {});
}
