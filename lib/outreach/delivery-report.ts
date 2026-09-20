import { serviceClient } from '@/lib/stripe';
import { effectiveDeliveryStatus } from '@/lib/outreach/domain';
import { getOutreachProvider } from '@/lib/outreach/providers';
import type { DeliveryStatus } from '@/types/outreach';

export type DeliveryReportRow = {
  id: string;
  email: string;
  contactName: string;
  studio: string;
  campaign: string;
  status: string;
  providerMessageId: string | null;
  subject: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  bouncedAt: string | null;
  errorMessage: string | null;
};

export async function getDeliveryReport(): Promise<DeliveryReportRow[]> {
  try {
    // This page is already protected by the outreach admin layout. Use the
    // service client so report reads are not affected by the browser session's
    // RLS claims, which can otherwise make a successful send look missing.
    const client = serviceClient();
    const { data, error } = await client.from('outreach_deliveries').select('id, provider_message_id, status, rendered_subject, sent_at, delivered_at, opened_at, clicked_at, bounced_at, error_message, outreach_contacts(email, first_name, last_name, company_name), outreach_campaigns(name), outreach_events(event_type, occurred_at)').order('created_at', { ascending: false });
    if (error) throw error;
    const resendEnabled = process.env.OUTREACH_EMAIL_PROVIDER === 'resend' || process.env.OUTREACH_PROVIDER === 'resend';
    const provider = resendEnabled && (process.env.OUTREACH_PROVIDER_API_KEY || process.env.RESEND_API_KEY) ? getOutreachProvider() : null;
    return await Promise.all((data ?? []).map(async (row) => {
      const contact = Array.isArray(row.outreach_contacts) ? row.outreach_contacts[0] : row.outreach_contacts;
      const campaign = Array.isArray(row.outreach_campaigns) ? row.outreach_campaigns[0] : row.outreach_campaigns;
      const events = Array.isArray(row.outreach_events) ? row.outreach_events : [];
      let status = effectiveDeliveryStatus(row.status as DeliveryStatus, events.map((event) => event.event_type as DeliveryStatus));
      if ((status === 'queued' || status === 'submitted') && row.provider_message_id && provider?.getStatus) {
        const providerStatus = await provider.getStatus(row.provider_message_id).catch(() => null);
        if (providerStatus) status = effectiveDeliveryStatus(status, [providerStatus]);
        if (status !== row.status) await client.from('outreach_deliveries').update({ status, updated_at: new Date().toISOString() }).eq('id', row.id);
      }
      const eventAt = (eventType: string) => events.find((event) => event.event_type === eventType)?.occurred_at ?? null;
      return {
        id: row.id,
        email: contact?.email ?? 'Unknown email',
        contactName: [contact?.first_name, contact?.last_name].filter(Boolean).join(' ') || 'Unknown contact',
        studio: contact?.company_name ?? '—',
        campaign: campaign?.name ?? 'Outreach campaign',
        status,
        providerMessageId: row.provider_message_id,
        subject: row.rendered_subject,
        sentAt: row.sent_at,
        deliveredAt: row.delivered_at ?? eventAt('delivered'),
        openedAt: row.opened_at ?? eventAt('opened'),
        clickedAt: row.clicked_at ?? eventAt('clicked'),
        bouncedAt: row.bounced_at ?? eventAt('bounced'),
        errorMessage: row.error_message,
      };
    }));
  } catch (error) {
    console.error('[outreach-report] could not load delivery report:', error);
    return [];
  }
}
