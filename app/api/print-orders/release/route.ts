import { NextResponse } from 'next/server';
import { serviceClient, stripe } from '@/lib/stripe';

export const runtime = 'nodejs';

/**
 * Releases the hold of a checkout the buyer walked away from, so coming back
 * to the basket and trying again isn't blocked by their own reservation.
 *
 * Only the browser that opened the session knows its id. Expiring it on
 * Stripe first means it can no longer be paid; a session already paid or
 * expired is left as it is.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
  if (!/^cs_(test|live)_[A-Za-z0-9]{1,200}$/.test(sessionId)) {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId);
    if (session.status !== 'open') return NextResponse.json({ released: false });
    await stripe().checkout.sessions.expire(sessionId);
    await serviceClient().from('print_orders')
      .update({ status: 'expired', hold_expires_at: null })
      .eq('stripe_session_id', sessionId)
      .eq('status', 'pending_payment');
    return NextResponse.json({ released: true });
  } catch (err) {
    console.error('[print-orders/release] could not release', sessionId, err);
    return NextResponse.json({ released: false }, { status: 500 });
  }
}
