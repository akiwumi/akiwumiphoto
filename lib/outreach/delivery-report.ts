import { createServerClient } from '@/lib/supabase-server';

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
    const client = await createServerClient();
    const { data, error } = await client.from('outreach_deliveries').select('id, provider_message_id, status, rendered_subject, sent_at, delivered_at, opened_at, clicked_at, bounced_at, error_message, outreach_contacts(email, first_name, last_name, company_name), outreach_campaigns(name)').order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => {
      const contact = Array.isArray(row.outreach_contacts) ? row.outreach_contacts[0] : row.outreach_contacts;
      const campaign = Array.isArray(row.outreach_campaigns) ? row.outreach_campaigns[0] : row.outreach_campaigns;
      return {
        id: row.id,
        email: contact?.email ?? 'Unknown email',
        contactName: [contact?.first_name, contact?.last_name].filter(Boolean).join(' ') || 'Unknown contact',
        studio: contact?.company_name ?? '—',
        campaign: campaign?.name ?? 'Outreach campaign',
        status: row.status,
        providerMessageId: row.provider_message_id,
        subject: row.rendered_subject,
        sentAt: row.sent_at,
        deliveredAt: row.delivered_at,
        openedAt: row.opened_at,
        clickedAt: row.clicked_at,
        bouncedAt: row.bounced_at,
        errorMessage: row.error_message,
      };
    });
  } catch (error) {
    console.error('[outreach-report] could not load delivery report:', error);
    return [];
  }
}
