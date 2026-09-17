import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/print-shop';
import { getExchangeRates } from '@/lib/exchange-rates';
import { isCurrencyCode, type CurrencyCode } from '@/lib/currency';
import { countryOptions, isCountryCode } from '@/lib/countries';
import { canPayByCard, shippingFor } from '@/lib/shipping';
import { serviceClient, stripe, toCents } from '@/lib/stripe';
import { siteOrigin } from '@/lib/site-origin';
import type { PrintOrderLine } from '@/types';

export const runtime = 'nodejs';

interface Customer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  /** ISO 3166-1 alpha-2: decides shipping and where Stripe will deliver. */
  country: string;
  message: string;
}

// Stripe's shortest session; submit_print_order holds the prints a minute longer.
const CHECKOUT_MINUTES = 30;

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/**
 * Records a print order, holding its prints, and opens a Stripe Checkout
 * session for it. Returns the session's URL for the basket to go to.
 *
 * submit_print_order prices every line from the database and refuses anything
 * unavailable, so nothing the basket claims about prices is trusted, and
 * Stripe is charged exactly what the order recorded. The studio is emailed
 * from the webhook once payment completes, not here.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const raw = (body.customer ?? {}) as Record<string, unknown>;
  // Honeypot: accept silently so a bot learns nothing.
  if (text(raw.botcheck, 200)) return NextResponse.json({ ok: true, reference: null });

  const customer: Customer = {
    firstName: text(raw.firstName, 80),
    lastName: text(raw.lastName, 80),
    email: text(raw.email, 254),
    phone: text(raw.phone, 40),
    country: text(raw.country, 2).toUpperCase(),
    message: text(raw.message, 2000),
  };

  if (!isCountryCode(customer.country)) {
    return NextResponse.json({ error: 'Please choose the country your print is delivered to.' }, { status: 422 });
  }
  const countryName = countryOptions().find((c) => c.code === customer.country)?.name ?? customer.country;
  if (!canPayByCard(customer.country)) {
    return NextResponse.json({
      error: `Card payment isn't available for delivery to ${countryName}. Please get in touch and we'll arrange your order.`,
    }, { status: 422 });
  }
  const shipping = shippingFor(customer.country);

  const items = Array.isArray(body.items)
    ? body.items.slice(0, 50).map((item) => ({
        image_id: text(item?.imageId, 36),
        size_id: text(item?.sizeId, 36),
        quantity: Number.isInteger(item?.quantity) ? item.quantity : 0,
      }))
    : [];
  if (items.length === 0) {
    return NextResponse.json({ error: 'Your basket is empty.' }, { status: 422 });
  }

  // Convert at the server's rate, not one the browser supplies.
  const exchange = await getExchangeRates();
  const requested: CurrencyCode = isCurrencyCode(body.currency) ? body.currency : 'USD';
  const rate = exchange.rates[requested];
  const currency: CurrencyCode = rate ? requested : 'USD';
  const exchangeRate = rate ?? 1;

  const { data, error } = await publicClient().rpc('submit_print_order', {
    p_first_name: customer.firstName,
    p_last_name: customer.lastName,
    p_email: customer.email,
    p_phone: customer.phone,
    p_country: countryName,
    p_message: customer.message,
    p_currency: currency,
    p_exchange_rate: exchangeRate,
    p_items: items,
  });

  if (error) {
    const detail = error.details ? ` ${error.details}.` : '';
    switch (error.message) {
      case 'invalid_customer':
        return NextResponse.json({ error: 'Please check your name and email address.' }, { status: 422 });
      case 'unavailable':
        return NextResponse.json({ error: `A print in your basket is no longer available:${detail} Please remove it and try again.` }, { status: 409 });
      case 'insufficient_edition':
        return NextResponse.json({ error: `Not enough of an edition remains:${detail} Please lower the quantity and try again.` }, { status: 409 });
      default:
        console.error('[print-orders] could not record the order:', error);
        return NextResponse.json({ error: 'Your order could not be sent. Please try again.' }, { status: 500 });
    }
  }

  const order = data as { reference: string; lines: PrintOrderLine[]; total_usd: number };

  try {
    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      client_reference_id: order.reference,
      customer_email: customer.email,
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_MINUTES * 60,
      // Prices stay in USD; Stripe shows and charges the buyer's local currency where it can.
      adaptive_pricing: { enabled: true },
      line_items: order.lines.map((line) => ({
        quantity: line.quantity,
        price_data: {
          currency: 'usd',
          unit_amount: toCents(line.unit_price_usd),
          product_data: {
            name: `${line.image_title ? `“${line.image_title}”, ` : ''}${line.gallery_title}, photo ${line.position}`,
            description: `${line.size_name}${line.dimensions ? ` ${line.dimensions}` : ''} · archival print, signed and numbered`,
          },
        },
      })),
      shipping_address_collection: {
        allowed_countries: [customer.country],
      },
      shipping_options: [{
        shipping_rate_data: {
          type: 'fixed_amount',
          display_name: shipping.name,
          fixed_amount: { amount: toCents(shipping.usd), currency: 'usd' },
        },
      }],
      phone_number_collection: { enabled: !customer.phone },
      metadata: { reference: order.reference },
      payment_intent_data: {
        description: `Print order ${order.reference}`,
        metadata: { reference: order.reference },
      },
      success_url: `${siteOrigin(request)}/basket/paid?ref=${encodeURIComponent(order.reference)}`,
      cancel_url: `${siteOrigin(request)}/basket`,
    });

    const { error: linkError } = await serviceClient()
      .from('print_orders')
      .update({ stripe_session_id: session.id })
      .eq('reference', order.reference);
    if (linkError) throw linkError;

    return NextResponse.json({ ok: true, reference: order.reference, url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[print-orders] could not open checkout for', order.reference, err);
    // Release the hold straight away rather than leaving the prints reserved.
    await serviceClient().from('print_orders')
      .update({ status: 'cancelled', hold_expires_at: null })
      .eq('reference', order.reference);
    return NextResponse.json({ error: 'Payment could not be started. Please try again.' }, { status: 502 });
  }
}
