import { NextResponse } from 'next/server';
import { hashVisitorToken, isConsentedAnalyticsVisitor } from '@/lib/analytics';
import { serviceClient, stripe } from '@/lib/stripe';

export const runtime = 'nodejs';

/** Confirms Stripe's paid session and records one server-side conversion event. */
export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get('session_id');
  const visitorToken = request.headers.get('x-analytics-visitor-token');
  const consent = request.headers.get('x-analytics-consent');
  if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') return NextResponse.json({ ok: false });
    const { data, error } = await serviceClient()
      .from('print_orders')
      .select('id')
      .eq('stripe_session_id', sessionId)
      .eq('status', 'paid')
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ ok: false });

    if (!isConsentedAnalyticsVisitor(consent, visitorToken)) return NextResponse.json({ ok: true, tracked: false });
    const attributionToken = visitorToken;
    const hashedAttribution = hashVisitorToken(attributionToken);
    const { error: analyticsError } = await serviceClient().from('analytics_events').insert({
      event_name: 'payment_success',
      visitor_hash: hashedAttribution,
      session_id: hashedAttribution,
      path: '/basket/paid',
      referrer_origin: null,
      device_class: 'unknown',
      metadata: { category: 'prints' },
      dedupe_key: hashVisitorToken(`payment_success:${sessionId}`).slice(0, 64),
    });
    if (analyticsError && !/duplicate|unique/i.test(analyticsError.message)) throw analyticsError;
    return NextResponse.json({ ok: true, tracked: true });
  } catch (error) {
    console.error('[verify-paid] could not verify order:', error);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
