import { NextRequest, NextResponse } from 'next/server';

const TO_EMAIL = 'akiwumi@gmail.com';

/**
 * Resend refuses a `from` on an unverified domain. Until akiwumiphoto.com is
 * verified in Resend, their shared onboarding sender is the working default —
 * it may only deliver to the address the Resend account was opened with, which
 * is TO_EMAIL, so the contact form works either way.
 */
const FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || 'Akiwumi Photo <onboarding@resend.dev>';

const MAX = { name: 200, email: 200, subject: 120, message: 1000 };

function clean(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[contact] RESEND_API_KEY is not set — refusing to claim the message was sent');
    return NextResponse.json({ error: 'Email is not configured on the server.' }, { status: 503 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  // Honeypot: a field hidden from people, so anything filling it is a bot.
  // Answer as though it succeeded rather than teaching the bot what failed.
  if (clean(payload.website, 100)) {
    console.warn('[contact] honeypot tripped — dropping submission');
    return NextResponse.json({ success: true });
  }

  const name = clean(payload.name, MAX.name);
  const email = clean(payload.email, MAX.email);
  const subject = clean(payload.subject, MAX.subject) || 'General Enquiry';
  const message = clean(payload.message, MAX.message);

  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Please fill in your name, email and message.' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'That email address does not look right.' }, { status: 400 });
  }

  // Sent as plain text: nothing a visitor types can be interpreted as markup.
  const text = [
    `Name:    ${name}`,
    `Email:   ${email}`,
    `Subject: ${subject}`,
    '',
    message,
  ].join('\n');

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        reply_to: email,
        subject: `[akiwumiphoto.com] ${subject} — ${name}`,
        text,
      }),
    });

    if (!res.ok) {
      console.error('[contact] Resend rejected the send:', res.status, await res.text());
      return NextResponse.json({ error: 'The message could not be sent.' }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[contact] could not reach Resend:', err);
    return NextResponse.json({ error: 'The message could not be sent.' }, { status: 502 });
  }
}
