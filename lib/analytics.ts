import { createHmac } from 'node:crypto';

export const ANALYTICS_EVENT_NAMES = [
  'page_view', 'gallery_view', 'image_open', 'contact_submit',
  'product_view', 'basket_add', 'basket_remove', 'checkout_start',
  'payment_success', 'payment_failure', 'registration_complete',
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];
export type DeviceClass = 'desktop' | 'mobile' | 'tablet' | 'unknown';
export type AnalyticsMetadata = Record<string, string>;

const EVENT_SET = new Set<string>(ANALYTICS_EVENT_NAMES);
const METADATA_KEYS = new Set([
  'galleryId', 'gallerySlug', 'imageId', 'imageSlug', 'productId', 'sizeId',
  'category', 'failureCategory',
]);
const SAFE_VALUE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export type AnalyticsInput = {
  eventName: unknown;
  path: unknown;
  visitorToken: unknown;
  sessionId?: unknown;
  metadata?: unknown;
  referrer?: unknown;
};

export type NormalizedAnalyticsEvent = {
  eventName: AnalyticsEventName;
  path: string;
  visitorToken: string;
  sessionId: string;
  metadata: AnalyticsMetadata;
  referrerOrigin: string | null;
};

export function normalizePath(value: unknown): string | null {
  if (typeof value !== 'string' || value.length < 1 || value.length > 512) return null;
  if (!value.startsWith('/') || value.includes('?') || value.includes('#') || /[\u0000-\u001f]/.test(value)) return null;
  return value;
}

export function normalizeReferrer(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.origin;
  } catch { return null; }
}

export function normalizeDeviceClass(userAgent: unknown): DeviceClass {
  if (typeof userAgent !== 'string') return 'unknown';
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|kindle|silk/.test(ua)) return 'tablet';
  if (/mobi|iphone|ipod|android/.test(ua)) return 'mobile';
  if (/mozilla|chrome|safari|firefox|edge|opera/.test(ua)) return 'desktop';
  return 'unknown';
}

export function sanitizeMetadata(value: unknown): AnalyticsMetadata | null {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const metadata: AnalyticsMetadata = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!METADATA_KEYS.has(key)) continue;
    if (typeof raw !== 'string' || raw.length > 128 || !SAFE_VALUE.test(raw) || /@/.test(raw)) return null;
    metadata[key] = raw;
  }
  return metadata;
}

export function hashVisitorToken(token: string, secret = process.env.ANALYTICS_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'development-analytics-secret'): string {
  return createHmac('sha256', secret).update(token).digest('hex');
}

export function createDedupeKey(event: Pick<NormalizedAnalyticsEvent, 'eventName' | 'path' | 'visitorToken' | 'metadata'>, bucket = Math.floor(Date.now() / 10_000)): string {
  const payload = JSON.stringify([event.eventName, event.path, event.visitorToken, event.metadata, bucket]);
  return hashVisitorToken(payload).slice(0, 64);
}

export function normalizeAnalyticsEvent(input: AnalyticsInput): NormalizedAnalyticsEvent | null {
  if (typeof input.eventName !== 'string' || !EVENT_SET.has(input.eventName)) return null;
  if (typeof input.visitorToken !== 'string' || input.visitorToken.length < 16 || input.visitorToken.length > 128 || !SAFE_VALUE.test(input.visitorToken) || input.visitorToken.includes('@')) return null;
  const path = normalizePath(input.path);
  const metadata = sanitizeMetadata(input.metadata);
  if (!path || !metadata) return null;
  const sessionId = typeof input.sessionId === 'string' && input.sessionId.length >= 16 && input.sessionId.length <= 128 && SAFE_VALUE.test(input.sessionId) && !input.sessionId.includes('@')
    ? input.sessionId : input.visitorToken;
  return {
    eventName: input.eventName as AnalyticsEventName,
    path,
    visitorToken: input.visitorToken,
    sessionId,
    metadata,
    referrerOrigin: normalizeReferrer(input.referrer),
  };
}
