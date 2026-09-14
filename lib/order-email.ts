/**
 * Server-only. The email the studio receives for every print order, sent
 * through Resend from the verified akiwumiphoto.com domain. Sending happens
 * on the server as soon as the order is recorded, so it doesn't depend on
 * the buyer's browser staying open or on anything it might block.
 */
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
}

export function orderEmailSubject(order: OrderForEmail): string {
  return `New print order ${order.reference} — ${order.first_name} ${order.last_name} — ${formatMoney(Number(order.total_usd), 'USD')}`;
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

  const rate = Number(order.exchange_rate);
  const converted = order.currency === 'USD'
    ? []
    : [`The buyer viewed prices in ${order.currency}: about ${formatMoney(Number(order.total_usd) * rate, order.currency)}`
       + ` (1 USD = ${rate} ${order.currency}, ECB rate${ratesDate ? ` of ${ratesDate}` : ''}).`];

  return [
    `New print order ${order.reference}`,
    `Placed ${placed} (Stockholm time)`,
    '',
    'BUYER',
    `Name: ${order.first_name} ${order.last_name}`,
    `Email: ${order.email}`,
    `Phone: ${order.phone || 'not given'}`,
    `Country: ${order.country || 'not given'}`,
    ...(order.message ? ['Message:', order.message] : []),
    '',
    'PRINTS',
    ...lines,
    '',
    `TOTAL: ${usd(order.total_usd)} USD`,
    ...converted,
    '',
    'Reply to this email to write to the buyer.',
    'Next: send the buyer payment links, then record each sale under Admin → Prints → Availability & sold.',
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
