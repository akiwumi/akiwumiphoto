import { NextResponse } from 'next/server'; import { getOutreachProvider } from '@/lib/outreach/providers'; import { serviceClient } from '@/lib/stripe'; import { shouldApplyDeliveryEvent } from '@/lib/outreach/domain'; import type { DeliveryStatus } from '@/types/outreach';

const timestampColumn: Record<string, string> = { delivered: 'delivered_at', opened: 'opened_at', clicked: 'clicked_at', bounced: 'bounced_at' };

export async function POST(request: Request) {
  try {
    const provider = getOutreachProvider();
    const payload = await provider.verifyWebhook(request);
    const events = provider.normaliseWebhookEvent(payload);
    const client = serviceClient();
    let unmatched = 0;
    for (const event of events) {
      const delivery = await client.from('outreach_deliveries').select('id,status').eq('provider_message_id', event.providerMessageId).maybeSingle();
      if (delivery.error) throw delivery.error;
      // Resend can deliver the webhook immediately after accepting the email,
      // before the send route has finished writing its delivery row. Return a
      // non-2xx response so the provider retries instead of losing the event.
      if (!delivery.data) {
        unmatched += 1;
        continue;
      }
      const occurredAt = event.occurredAt || new Date().toISOString();
      const eventInsert = await client.from('outreach_events').upsert({ delivery_id: delivery.data.id, provider_event_id: event.providerEventId, event_type: event.status, payload_json: event.payload, occurred_at: occurredAt }, { onConflict: 'provider_event_id' });
      if (eventInsert.error) throw eventInsert.error;
      if (!shouldApplyDeliveryEvent(delivery.data.status as DeliveryStatus, event.status)) continue;
      const update: Record<string, string> = { status: event.status, updated_at: new Date().toISOString() };
      const column = timestampColumn[event.status];
      if (column) update[column] = occurredAt;
      const deliveryUpdate = await client.from('outreach_deliveries').update(update).eq('id', delivery.data.id);
      if (deliveryUpdate.error) throw deliveryUpdate.error;
    }
    if (unmatched > 0) {
      return NextResponse.json({ error: 'Delivery record not ready; retry webhook.', accepted: events.length - unmatched, unmatched }, { status: 500 });
    }
    return NextResponse.json({ accepted: events.length });
  } catch { return NextResponse.json({ error: 'Invalid webhook.' }, { status: 400 }); }
}
