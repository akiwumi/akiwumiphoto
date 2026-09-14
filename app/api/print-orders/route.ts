import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/print-shop';
import { getExchangeRates } from '@/lib/exchange-rates';
import { isCurrencyCode, type CurrencyCode } from '@/lib/currency';
import { sendOrderNotification } from '@/lib/order-email';
import type { PrintOrderLine } from '@/types';

export const runtime = 'nodejs';

interface Customer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  message: string;
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/**
 * Records a print order and emails it to the studio.
 *
 * submit_print_order prices every line from the database and refuses anything
 * unavailable, so nothing the basket claims about prices is trusted. The
 * notification is sent here on the server once the order is recorded.
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
    country: text(raw.country, 80),
    message: text(raw.message, 2000),
  };

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
    p_country: customer.country,
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

  // Awaited so the function isn't frozen before the email leaves; a failed
  // notification is logged but never fails the buyer's checkout.
  await sendOrderNotification({
    reference: order.reference,
    lines: order.lines,
    total_usd: order.total_usd,
    first_name: customer.firstName,
    last_name: customer.lastName,
    email: customer.email,
    phone: customer.phone || null,
    country: customer.country || null,
    message: customer.message || null,
    currency,
    exchange_rate: exchangeRate,
    created_at: new Date(),
  }, exchange.date);

  return NextResponse.json({ ok: true, reference: order.reference });
}
