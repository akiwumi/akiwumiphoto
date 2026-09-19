import { NextResponse } from 'next/server'; import { getOutreachProvider } from '@/lib/outreach/providers';
export async function POST(request: Request) { try { const payload = await getOutreachProvider().verifyWebhook(request); const events = getOutreachProvider().normaliseWebhookEvent(payload); return NextResponse.json({ accepted: events.length, events }); } catch { return NextResponse.json({ error: 'Invalid webhook.' }, { status: 400 }); } }

