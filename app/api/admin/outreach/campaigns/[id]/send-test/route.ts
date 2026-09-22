import { NextResponse } from 'next/server'; import { getOutreachProvider } from '@/lib/outreach/providers'; import { requireOutreachAdmin } from '@/lib/outreach/auth'; import { serviceClient } from '@/lib/stripe'; import { shouldApplyDeliveryEvent } from '@/lib/outreach/domain'; import type { DeliveryStatus } from '@/types/outreach';

export async function POST(request: Request) {
  try {
    const { client, user } = await requireOutreachAdmin();
    const body = await request.json().catch(() => null) as { campaignId?: string; contactId?: string; name?: string; studio?: string; country?: string; website?: string; to?: string; subject?: string; html?: string; text?: string } | null;
    if (!body?.to || !body?.subject || !body?.html || !body?.text) return NextResponse.json({ error: 'Rendered test message is incomplete.' }, { status: 422 });
    const result = await getOutreachProvider().send({ to: body.to, from: 'Eugene Akiwumi <info@akiwumiphoto.com>', replyTo: 'info@akiwumiphoto.com', subject: body.subject, html: body.html, text: body.text, headers: { 'Reply-To': 'info@akiwumiphoto.com' } });

    let deliveryId: string | null = null;
    let trackingError: string | null = null;
    if (client && body.campaignId && body.contactId) try {
      const database = serviceClient();
      const existingContact = await database.from('outreach_contacts').select('id').eq('email', body.to).maybeSingle();
      if (existingContact.error) throw existingContact.error;
      let contactId = existingContact.data?.id;
      if (!contactId) {
        const nameParts = (body.name || body.to).trim().split(/\s+/);
        const createdContact = await database.from('outreach_contacts').insert({ email: body.to, first_name: nameParts[0] || null, last_name: nameParts.slice(1).join(' ') || null, company_name: body.studio || null, country: body.country || 'Sweden', website: body.website && body.website !== '#' ? body.website : null, source: 'Campaign recipient', approved_for_outreach: true, contact_status: 'approved' }).select('id').single();
        if (createdContact.error) throw createdContact.error;
        contactId = createdContact.data.id;
      }
      const campaign = await database.from('outreach_campaigns').upsert({ id: body.campaignId, name: 'Akiwumi Photo outreach', subject: body.subject, html_template: body.html, text_template: body.text, from_name: 'Eugene Akiwumi', from_email: 'info@akiwumiphoto.com', reply_to_email: 'info@akiwumiphoto.com', status: 'sending', created_by: user?.id ?? null }, { onConflict: 'id' }).select('id').single();
      if (campaign.error) throw campaign.error;
      const existingDelivery = await database.from('outreach_deliveries').select('id,status').eq('campaign_id', campaign.data.id).eq('contact_id', contactId).maybeSingle();
      if (existingDelivery.error) throw existingDelivery.error;
      const sentAt = new Date().toISOString();
      const delivery = existingDelivery.data
        ? await database.from('outreach_deliveries').update({ provider_message_id: result.providerMessageId, rendered_subject: body.subject, sent_at: sentAt, updated_at: sentAt, ...(shouldApplyDeliveryEvent(existingDelivery.data.status as DeliveryStatus, 'submitted') ? { status: 'submitted' } : {}) }).eq('id', existingDelivery.data.id).select('id').single()
        : await database.from('outreach_deliveries').insert({ campaign_id: campaign.data.id, contact_id: contactId, provider_message_id: result.providerMessageId, status: 'submitted', rendered_subject: body.subject, sent_at: sentAt }).select('id').single();
      if (delivery.error) throw delivery.error;
      deliveryId = delivery.data.id;
    } catch (error) {
      console.error('[outreach-send] email accepted but delivery tracking failed', error);
      trackingError = 'Email accepted, but delivery tracking could not be recorded.';
    }
    return NextResponse.json({ ok: true, providerMessageId: result.providerMessageId, deliveryId, recipientStatusChanged: false, trackingError });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to record delivery.' }, { status: 400 });
  }
}
