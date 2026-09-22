import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createDedupeKey, hashVisitorToken, normalizeAnalyticsEvent, normalizeDeviceClass } from '@/lib/analytics';

const MAX_BODY_BYTES = 16_384;
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;
const requests = new Map<string, { count: number; resetAt: number }>();

function ignored() { return NextResponse.json({ ok: true }); }

function isBot(userAgent: string) {
  return /bot|crawl|spider|slurp|headless|monitor|uptime|preview|facebookexternalhit|linkedinbot/i.test(userAgent);
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role is not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(request: Request) {
  const userAgent = request.headers.get('user-agent') || '';
  if (isBot(userAgent)) return ignored();
  const headerConsent = request.headers.get('x-analytics-consent') === 'accepted';
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) return ignored();

  const ip = (request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const previous = requests.get(ip);
  if (previous && previous.resetAt > now && previous.count >= MAX_REQUESTS) return ignored();
  requests.set(ip, previous && previous.resetAt > now ? { count: previous.count + 1, resetAt: previous.resetAt } : { count: 1, resetAt: now + WINDOW_MS });

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return ignored();
    body = JSON.parse(text);
  } catch { return ignored(); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return ignored();
  const raw = body as Record<string, unknown>;
  if (!headerConsent && raw.consent !== true) return ignored();
  const event = normalizeAnalyticsEvent({
    eventName: raw.eventName,
    path: raw.path,
    visitorToken: raw.visitorToken,
    sessionId: raw.sessionId,
    metadata: raw.metadata,
    referrer: raw.referrer,
  });
  if (!event || event.path.startsWith('/admin') || event.path.startsWith('/auth') || event.path.startsWith('/register/verified')) return ignored();

  try {
    const { error } = await serviceClient().from('analytics_events').insert({
      event_name: event.eventName,
      visitor_hash: hashVisitorToken(event.visitorToken),
      session_id: hashVisitorToken(event.sessionId).slice(0, 64),
      path: event.path,
      referrer_origin: event.referrerOrigin,
      device_class: normalizeDeviceClass(userAgent),
      metadata: event.metadata,
      dedupe_key: createDedupeKey(event),
    });
    if (error && !/duplicate|unique/i.test(error.message)) console.error('[analytics] insert failed', error.message);
  } catch (error) { console.error('[analytics] unavailable', error); }
  return ignored();
}
