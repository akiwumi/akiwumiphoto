import { NextResponse } from 'next/server';
import { requireOutreachAdmin } from '@/lib/outreach/auth';
import { getOutreachProvider } from '@/lib/outreach/providers';

export async function POST(request: Request) {
  try {
    await requireOutreachAdmin();
    const body = await request.json() as { to?: string; from?: string; replyTo?: string; subject?: string; html?: string; text?: string };
    if (!body.to || !body.subject || !body.html || !body.text) return NextResponse.json({ error: 'Recipient and rendered message are required.' }, { status: 422 });
    const result = await getOutreachProvider().send({
      to: body.to,
      from: 'Eugene Akiwumi <info@akiwumiphoto.com>',
      replyTo: 'info@akiwumiphoto.com',
      subject: body.subject,
      html: body.html,
      text: body.text,
      headers: { 'X-Akiwumi-Outreach-Test': 'true' },
    });
    return NextResponse.json({ ok: true, providerMessageId: result.providerMessageId, provider: process.env.OUTREACH_EMAIL_PROVIDER || process.env.OUTREACH_PROVIDER || 'mock', recipientStatusChanged: false });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Test send failed.' }, { status: 400 });
  }
}
