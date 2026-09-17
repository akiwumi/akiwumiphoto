/**
 * Server-only. The email the studio receives for every paid print order, sent
 * through Resend from the verified akiwumiphoto.com domain. Sending happens
 * from the Stripe webhook once payment completes, so it doesn't depend on
 * the buyer's browser staying open or on anything it might block.
 */
import type Stripe from 'stripe';
import { formatMoney } from './currency';
import { SITE_URL } from './site-origin';
import type { PrintOrderLine } from '@/types';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const ORDER_ADDRESS = 'order@akiwumiphoto.com';
const FROM = `Akiwumi Photo Orders <${ORDER_ADDRESS}>`;

export interface OrderForEmail {
  reference: string;
  lines: PrintOrderLine[];
  total_usd: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  country: string | null;
  message: string | null;
  currency: string;
  exchange_rate: number;
  created_at: Date;
  paid?: {
    /** In the smallest unit of the currency the buyer was charged in. */
    amount: number;
    currency: string;
    shipping_usd: number | null;
    address: Stripe.Checkout.Session.CollectedInformation.ShippingDetails | null;
  };
}

function chargedAmount(paid: NonNullable<OrderForEmail['paid']>): string {
  const currency = paid.currency.toUpperCase();
  // Stripe counts most currencies in hundredths; resolvedOptions knows which don't.
  const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
  return formatMoney(paid.amount / 10 ** digits, currency);
}

export function orderEmailSubject(order: OrderForEmail): string {
  return `${order.paid ? 'Paid' : 'New'} print order ${order.reference} — ${order.first_name} ${order.last_name} — ${formatMoney(Number(order.total_usd), 'USD')}`;
}

export function orderEmailText(order: OrderForEmail, ratesDate: string | null = null): string {
  const usd = (amount: number) => formatMoney(Number(amount), 'USD');
  const placed = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Stockholm',
  }).format(order.created_at);

  const lines = order.lines.map((line, i) => {
    const name = line.image_title ? `“${line.image_title}”, ${line.gallery_title}` : line.gallery_title;
    const edition = line.edition_size === 1
      ? `Unique print (${line.sold >= 1 ? 'already marked sold' : 'available'} before this order)`
      : `Edition: ${line.sold} of ${line.edition_size} sold before this order`;
    return [
      `${i + 1}. ${name}, photo ${line.position} (ref ${line.file_ref})`,
      `   ${line.size_name}${line.dimensions ? `, ${line.dimensions}` : ''}: ${line.quantity} × ${usd(line.unit_price_usd)} = ${usd(line.line_total_usd)}`,
      `   ${edition}`,
      `   ${SITE_URL}/gallery/${line.gallery_slug}`,
    ].join('\n');
  });

  const paid = order.paid;
  const address = paid?.address
    ? [paid.address.name, paid.address.address.line1, paid.address.address.line2,
       [paid.address.address.postal_code, paid.address.address.city].filter(Boolean).join(' '),
       paid.address.address.state, paid.address.address.country].filter(Boolean)
    : [];

  const rate = Number(order.exchange_rate);
  const converted = order.currency === 'USD'
    ? []
    : [`The buyer viewed prices in ${order.currency}: about ${formatMoney(Number(order.total_usd) * rate, order.currency)}`
       + ` (1 USD = ${rate} ${order.currency}, ECB rate${ratesDate ? ` of ${ratesDate}` : ''}).`];

  return [
    `${paid ? 'Paid' : 'New'} print order ${order.reference}`,
    `Placed ${placed} (Stockholm time)`,
    ...(paid ? [`Paid by card through Stripe: ${chargedAmount(paid)} including shipping`] : []),
    '',
    'BUYER',
    `Name: ${order.first_name} ${order.last_name}`,
    `Email: ${order.email}`,
    `Phone: ${order.phone || 'not given'}`,
    `Country: ${order.country || 'not given'}`,
    ...(order.message ? ['Message:', order.message] : []),
    '',
    ...(address.length ? ['DELIVER TO', ...address, ''] : []),
    'PRINTS',
    ...lines,
    '',
    ...(paid?.shipping_usd != null ? [`PRINTS: ${usd(order.total_usd)} USD`, `SHIPPING: ${usd(paid.shipping_usd)} USD`] : []),
    `TOTAL: ${usd(Number(order.total_usd) + Number(paid?.shipping_usd ?? 0))} USD`,
    ...converted,
    '',
    'Reply to this email to write to the buyer.',
    paid
      ? 'Sold counts have been updated. Next: produce and ship the prints.'
      : 'Next: send the buyer payment links, then record each sale under Admin → Prints → Availability & sold.',
  ].join('\n');
}

/**
 * Emails the order to order@akiwumiphoto.com, which the domain's email
 * forwarding delivers onward; replies go to the buyer. Returns false rather
 * than throwing: the order is already recorded and the buyer's checkout must
 * not fail because a notification did.
 */
export async function sendOrderNotification(order: OrderForEmail, ratesDate: string | null = null): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[order-email] RESEND_API_KEY is not set; order', order.reference, 'was not emailed');
    return false;
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [ORDER_ADDRESS],
        reply_to: order.email,
        subject: orderEmailSubject(order),
        text: orderEmailText(order, ratesDate),
      }),
    });
    if (res.ok) return true;
    console.error('[order-email] Resend rejected order', order.reference, res.status, await res.text().catch(() => ''));
    return false;
  } catch (err) {
    console.error('[order-email] could not reach Resend for order', order.reference, err);
    return false;
  }
}
