import type { ContactStatus, DeliveryStatus, OutreachContact } from '@/types/outreach';

export function normalizeEmail(value: unknown): string {
  return String(value ?? '').normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase();
}
export function isValidEmail(email: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email)); }
export function cleanCell(value: unknown): string | null { const text = String(value ?? '').normalize('NFKC').replace(/\s+/gu, ' ').trim(); return text || null; }
export function isEligibleContact(contact: Pick<OutreachContact, 'approved_for_outreach' | 'contact_status' | 'suppressed_at'> & { bounced?: boolean }): boolean {
  return contact.approved_for_outreach && !contact.suppressed_at && contact.contact_status !== 'suppressed' && !contact.bounced;
}
const ORDER: Record<DeliveryStatus, number> = { queued: 0, submitted: 1, delivered: 2, opened: 3, clicked: 4, bounced: 5, failed: 5, unsubscribed: 5 };
export function canAdvanceDelivery(from: DeliveryStatus, to: DeliveryStatus): boolean { return from === to || ORDER[to] >= ORDER[from] || (from === 'queued' && to === 'failed'); }
export function statusForReply(status: ContactStatus): ContactStatus { return status === 'converted' || status === 'not_interested' ? status : 'replied'; }

