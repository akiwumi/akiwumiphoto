import { NextResponse } from 'next/server'; import { getOutreachProvider } from '@/lib/outreach/providers'; import { serviceClient } from '@/lib/stripe';

const timestampColumn: Record<string, string> = { delivered: 'delivered_at', opened: 'opened_at', clicked: 'clicked_at', bounced: 'bounced_at' };

export async function POST(request: Request) {
  try {
    const provider = getOutreachProvider();
    const payload = await provider.verifyWebhook(request);
    const events = provider.normaliseWebhookEvent(payload);
    const client = serviceClient();
    for (const event of events) {
      const delivery = await client.from('outreach_deliveries').select('id').eq('provider_message_id', event.providerMessageId).maybeSingle();
      if (delivery.error) throw delivery.error;
      if (!delivery.data) continue;
      const occurredAt = event.occurredAt || new Date().toISOString();
      const eventInsert = await client.from('outreach_events').upsert({ delivery_id: delivery.data.id, provider_event_id: event.providerEventId, event_type: event.status, payload_json: event.payload, occurred_at: occurredAt }, { onConflict: 'provider_event_id' });
      if (eventInsert.error) throw eventInsert.error;
      const update: Record<string, string> = { status: event.status, updated_at: new Date().toISOString() };
      const column = timestampColumn[event.status];
      if (column) update[column] = occurredAt;
      const deliveryUpdate = await client.from('outreach_deliveries').update(update).eq('id', delivery.data.id);
      if (deliveryUpdate.error) throw deliveryUpdate.error;
    }
    return NextResponse.json({ accepted: events.length });
  } catch { return NextResponse.json({ error: 'Invalid webhook.' }, { status: 400 }); }
}
