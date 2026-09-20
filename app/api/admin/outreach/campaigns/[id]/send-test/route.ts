import { NextResponse } from 'next/server'; import { getOutreachProvider } from '@/lib/outreach/providers'; import { requireOutreachAdmin } from '@/lib/outreach/auth'; import { serviceClient } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    const { client, user } = await requireOutreachAdmin();
    const body = await request.json().catch(() => null) as { campaignId?: string; contactId?: string; to?: string; subject?: string; html?: string; text?: string } | null;
    if (!body?.to || !body?.subject || !body?.html || !body?.text) return NextResponse.json({ error: 'Rendered test message is incomplete.' }, { status: 422 });
    const result = await getOutreachProvider().send({ to: body.to, from: 'Eugene Akiwumi <info@akiwumiphoto.com>', replyTo: 'info@akiwumiphoto.com', subject: body.subject, html: body.html, text: body.text, headers: { 'Reply-To': 'info@akiwumiphoto.com' } });

    let deliveryId: string | null = null;
    if (client && body.campaignId && body.contactId) {
      const database = serviceClient();
      const campaign = await database.from('outreach_campaigns').upsert({ id: body.campaignId, name: 'Akiwumi Photo outreach', subject: body.subject, html_template: body.html, text_template: body.text, from_name: 'Eugene Akiwumi', from_email: 'info@akiwumiphoto.com', reply_to_email: 'info@akiwumiphoto.com', status: 'sending', created_by: user?.id ?? null }, { onConflict: 'id' }).select('id').single();
      if (campaign.error) throw campaign.error;
      const delivery = await database.from('outreach_deliveries').upsert({ campaign_id: campaign.data.id, contact_id: body.contactId, provider_message_id: result.providerMessageId, status: 'submitted', rendered_subject: body.subject, sent_at: new Date().toISOString() }, { onConflict: 'campaign_id,contact_id' }).select('id').single();
      if (delivery.error) throw delivery.error;
      deliveryId = delivery.data.id;
    }
    return NextResponse.json({ ok: true, providerMessageId: result.providerMessageId, deliveryId, recipientStatusChanged: false });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to record delivery.' }, { status: 400 });
  }
}
