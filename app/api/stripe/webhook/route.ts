import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { sendOrderNotification } from '@/lib/order-email';
import { serviceClient, stripe } from '@/lib/stripe';
import { shippingUsdForSession } from '@/lib/shipping';
import type { PrintOrder } from '@/types';

export const runtime = 'nodejs';

/**
 * Stripe's notifications about Checkout sessions. A paid session marks its
 * order paid, adds the prints to the sold counts and emails the studio; an
 * expired one releases the order's hold.
 *
 * Stripe retries anything but a 2xx, and may deliver an event twice, so every
 * step is safe to repeat: mark_print_order_paid only acts the first time.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');
  if (!secret || !signature) {
    return NextResponse.json({ error: 'Not configured.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    // The signature covers the exact bytes Stripe sent, so read the raw body.
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch (err) {
    console.error('[stripe-webhook] bad signature:', err);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        if (event.data.object.payment_status === 'paid') await settle(event.data.object);
        break;
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed':
        await serviceClient().from('print_orders')
          .update({ status: 'expired', hold_expires_at: null })
          .eq('stripe_session_id', event.data.object.id)
          .eq('status', 'pending_payment');
        break;
    }
  } catch (err) {
    console.error('[stripe-webhook] could not handle', event.type, event.id, err);
    return NextResponse.json({ error: 'Could not handle the event.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function settle(session: Stripe.Checkout.Session) {
  const details = session.collected_information?.shipping_details ?? null;
  const { data, error } = await serviceClient().rpc('mark_print_order_paid', {
    p_session_id: session.id,
    p_shipping_usd: shippingUsdForSession(session),
    p_shipping_address: details
      ? { name: details.name, address: details.address, phone: session.customer_details?.phone ?? null }
      : null,
  });
  if (error) throw error;

  // Null when an earlier delivery of this event already settled the order.
  const order = data as PrintOrder | null;
  if (!order) return;

  await sendOrderNotification({
    ...order,
    phone: order.phone ?? session.customer_details?.phone ?? null,
    created_at: new Date(order.created_at),
    paid: {
      amount: session.amount_total ?? 0,
      currency: session.currency ?? 'usd',
      shipping_usd: order.shipping_usd,
      address: details,
    },
  });
}
