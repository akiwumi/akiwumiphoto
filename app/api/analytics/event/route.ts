import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createDedupeKey, hashVisitorToken, normalizeAnalyticsEvent, normalizeDeviceClass } from '../../../../lib/analytics.ts';

const MAX_BODY_BYTES = 16_384;
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;
const MAX_RATE_ENTRIES = 10_000;
const requests = new Map<string, { count: number; resetAt: number }>();
let testServiceClient: SupabaseClient | null = null;

/**
 * Vercel's x-vercel-forwarded-for is trusted as a platform-issued client IP.
 * Generic forwarding headers are accepted only when the deployment explicitly
 * sets TRUST_PROXY_HEADERS=true behind a known, trusted proxy.
 */
export function clientAddress(request: Request): string {
  const platformAddress = process.env.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for') : null;
  if (platformAddress) return platformAddress.split(',')[0].trim().slice(0, 128) || 'unknown';
  if (process.env.TRUST_PROXY_HEADERS === 'true') {
    return (request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown').split(',')[0].trim().slice(0, 128) || 'unknown';
  }
  return 'unknown';
}

export function rateLimitKey(request: Request, eventName: string, visitorHash?: string): string {
  const address = clientAddress(request);
  return address === 'unknown'
    ? `visitor:${(visitorHash || 'unknown').slice(0, 16)}:${eventName}`
    : `${address}:${eventName}`;
}

function ignored() { return Response.json({ ok: true }); }

function isBot(userAgent: string) {
  return /bot|crawl|spider|slurp|headless|monitor|uptime|preview|facebookexternalhit|linkedinbot/i.test(userAgent);
}

function serviceClient() {
  if (testServiceClient) return testServiceClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role is not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function setAnalyticsServiceClientForTest(client: SupabaseClient | null) {
  testServiceClient = client;
}

export async function POST(request: Request) {
  const userAgent = request.headers.get('user-agent') || '';
  if (isBot(userAgent)) return ignored();
  const headerConsent = request.headers.get('x-analytics-consent') === 'accepted';
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) return ignored();

  let body: unknown;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return ignored();
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

  const visitorHash = hashVisitorToken(event.visitorToken);
  // Local/non-proxy mode has no trustworthy IP. Fall back to the server hash
  // so one anonymous client cannot starve every other visitor.
  const rateKey = rateLimitKey(request, event.eventName, visitorHash);
  const now = Date.now();
  for (const [key, entry] of requests) if (entry.resetAt <= now) requests.delete(key);
  if (requests.size >= MAX_RATE_ENTRIES && !requests.has(rateKey)) return ignored();
  const previous = requests.get(rateKey);
  if (previous && previous.resetAt > now && previous.count >= MAX_REQUESTS) return ignored();
  requests.set(rateKey, previous && previous.resetAt > now ? { count: previous.count + 1, resetAt: previous.resetAt } : { count: 1, resetAt: now + WINDOW_MS });

  try {
    const { error } = await serviceClient().from('analytics_events').insert({
      event_name: event.eventName,
      visitor_hash: visitorHash,
      session_id: hashVisitorToken(event.sessionId).slice(0, 64),
      path: event.path,
      referrer_origin: event.referrerOrigin,
      device_class: normalizeDeviceClass(userAgent),
      metadata: event.metadata,
      dedupe_key: createDedupeKey(event, Math.floor(now / 10_000)),
    });
    if (error && !/duplicate|unique/i.test(error.message)) console.error('[analytics] insert failed', error.message);
  } catch (error) { console.error('[analytics] unavailable', error); }
  return ignored();
}
