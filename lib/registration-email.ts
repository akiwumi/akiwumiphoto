import { receiptEmail, type PrintRegistration } from './registration-receipt';

export async function sendRegistrationReceipt(registration: PrintRegistration): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const email = registration.collector_snapshot?.email;
  if (!apiKey || !email) return false;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `registration/${registration.id}` },
      body: JSON.stringify({ from: 'Akiwumi Photo <info@akiwumiphoto.com>', to: [email], reply_to: 'info@akiwumiphoto.com', ...receiptEmail(registration) }),
    });
    return response.ok;
  } catch { return false; }
}
