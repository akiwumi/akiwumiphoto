export const paymentMethods = {
  card: 'Card', bank_transfer: 'Bank transfer', cash: 'Cash', other: 'Other', unknown: 'Unknown',
} as const;
export type PaymentMethod = keyof typeof paymentMethods;

export interface CollectorSnapshot {
  first_name: string; last_name: string; email: string; phone: string;
  address_line1: string; address_line2?: string | null; city: string;
  region?: string | null; postcode: string; country_code: string;
}
export interface PrintRegistration {
  id: string; collector_id: string; artwork_title: string;
  purchase_reference: string | null; purchased_on: string | null; purchased_from: string | null;
  payment_method: PaymentMethod | null; message: string;
  status: 'received' | 'reviewing' | 'confirmed' | 'rejected'; created_at: string;
  gallery_image_id: string | null; collector_snapshot: CollectorSnapshot | null;
}

export const registrationNotice = 'This receipt records the details supplied by the collector. It does not confirm payment or authenticate the artwork.';

export function receiptFields(registration: PrintRegistration, legacyCollector?: CollectorSnapshot | null): [string, string][] {
  const c = registration.collector_snapshot ?? legacyCollector;
  const address = c ? [c.address_line1, c.address_line2, c.city, c.region, c.postcode, c.country_code].filter(Boolean).join(', ') : '';
  const registered = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Stockholm',
  }).format(new Date(registration.created_at));
  return [
    ['Registration reference', registration.id.toUpperCase()],
    ['Registered', `${registered} (Stockholm time)`],
    ['Status', registration.status],
    ['Collector', c ? `${c.first_name} ${c.last_name}` : 'Not provided'],
    ['Email', c?.email || 'Not provided'], ['Phone', c?.phone || 'Not provided'],
    ['Address', address || 'Not provided'], ['Photograph', registration.artwork_title],
    ['Order / edition reference', registration.purchase_reference || 'Not provided'],
    ['Purchase date', registration.purchased_on || 'Not provided'],
    ['Purchased from', registration.purchased_from || 'Not provided'],
    ['Payment method', registration.payment_method ? paymentMethods[registration.payment_method] ?? 'Not provided' : 'Not provided'],
    ['Notes', registration.message || 'Not provided'],
  ];
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

export function receiptEmail(registration: PrintRegistration) {
  const fields = receiptFields(registration);
  const url = `https://www.akiwumiphoto.com/register/receipts/${encodeURIComponent(registration.id)}`;
  return {
    subject: `Print registration receipt — ${registration.id.slice(0, 8).toUpperCase()}`,
    text: ['AKIWUMI PHOTO', 'Print registration receipt', '', ...fields.map(([label, value]) => `${label}: ${value}`), '', registrationNotice, '', `View or print your registration (sign-in required): ${url}`].join('\n'),
    html: `<div style="font-family:Arial,sans-serif;color:#181818;max-width:680px;margin:auto;padding:32px"><p style="letter-spacing:3px">AKIWUMI PHOTO</p><h1>Print registration receipt</h1><p>Thank you for registering your print. Your details are recorded below.</p><table style="width:100%;border-collapse:collapse">${fields.map(([label, value]) => `<tr><th align="left" valign="top" style="padding:12px 12px 12px 0;border-bottom:1px solid #ddd">${escapeHtml(label)}</th><td style="padding:12px 0;border-bottom:1px solid #ddd;white-space:pre-wrap;word-break:break-word">${escapeHtml(value)}</td></tr>`).join('')}</table><p style="font-size:13px">${registrationNotice}</p><p><a href="${url}">View / print registration</a> (sign-in required)</p></div>`,
  };
}
