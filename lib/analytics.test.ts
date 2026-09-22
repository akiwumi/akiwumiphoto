import test from 'node:test';
import assert from 'node:assert/strict';
import { canUseDemoFixture, getAnalyticsDemoSummary } from './analytics-demo.ts';
import { createDedupeKey, hashVisitorToken, isConsentedAnalyticsVisitor, isValidAnalyticsToken, normalizeAnalyticsEvent, normalizeDeviceClass, normalizePath, normalizeReferrer, sanitizeMetadata } from './analytics.ts';

test('normalizes the privacy-sensitive event fields', () => {
  const event = normalizeAnalyticsEvent({ eventName: 'gallery_view', path: '/gallery/forest', visitorToken: 'opaque-token-123456', metadata: { gallerySlug: 'forest', email: 'nope@example.com' }, referrer: 'https://example.com/page?x=1' });
  assert.deepEqual(event?.metadata, { gallerySlug: 'forest' });
  assert.equal(event?.referrerOrigin, 'https://example.com');
  assert.equal(normalizePath('/gallery?email=a'), null);
  assert.equal(normalizeAnalyticsEvent({ eventName: 'unknown', path: '/', visitorToken: 'opaque-token-123456' }), null);
});

test('normalizes device classes and hashes deterministically', () => {
  assert.equal(normalizeDeviceClass('Mozilla/5.0 (iPhone)'), 'mobile');
  assert.equal(normalizeDeviceClass('Mozilla/5.0 (iPad)'), 'tablet');
  assert.equal(normalizeDeviceClass('Mozilla/5.0 (X11; Linux x86_64)'), 'desktop');
  assert.equal(hashVisitorToken('same', 'secret'), hashVisitorToken('same', 'secret'));
  const event = normalizeAnalyticsEvent({ eventName: 'page_view', path: '/', visitorToken: 'opaque-token-123456' })!;
  assert.equal(createDedupeKey(event), createDedupeKey(event));
  assert.notEqual(createDedupeKey(event, 1), createDedupeKey(event, 2));
  assert.equal(createDedupeKey(event, 1), createDedupeKey(event, 1));
  assert.equal(normalizeReferrer('mailto:test@example.com'), null);
  assert.equal(sanitizeMetadata('bad'), null);
});

test('accepts only opaque analytics visitor tokens for attribution', () => {
  assert.equal(isValidAnalyticsToken('opaque-token-123456'), true);
  assert.equal(isValidAnalyticsToken('short'), false);
  assert.equal(isValidAnalyticsToken('visitor@example.com'), false);
  assert.equal(isValidAnalyticsToken('bad token with spaces'), false);
  assert.equal(isConsentedAnalyticsVisitor('accepted', 'opaque-token-123456'), true);
  assert.equal(isConsentedAnalyticsVisitor('declined', 'opaque-token-123456'), false);
  assert.equal(isConsentedAnalyticsVisitor('accepted', null), false);
});

test('maps deterministic demo values across default and custom preview ranges', () => {
  const defaultRange = getAnalyticsDemoSummary({ start: '2026-12-02T00:00:00.000Z', end: '2027-01-01T00:00:00.000Z' });
  assert.equal(defaultRange.daily.length, 30);
  assert.equal(defaultRange.daily[0].day, '2026-12-02');
  assert.equal(defaultRange.daily[0].page_views, 28);
  assert.equal(defaultRange.daily[29].page_views, 32);

  const customRange = getAnalyticsDemoSummary({ start: '2030-04-10T00:00:00.000Z', end: '2030-04-17T00:00:00.000Z' });
  assert.equal(customRange.daily.length, 7);
  assert.equal(customRange.daily[0].day, '2030-04-10');
  assert.equal(customRange.daily[6].day, '2030-04-16');
  assert.equal(customRange.daily[6].page_views, 40);
});

test('uses demo fallback for preview infrastructure gaps but never production or auth failures', () => {
  const env = process.env as Record<string, string | undefined>;
  const originalNodeEnv = env.NODE_ENV;
  env.NODE_ENV = 'development';
  assert.equal(canUseDemoFixture(new Error('function has_analytics_events does not exist')), true);
  assert.equal(canUseDemoFixture({ message: 'permission denied', code: '42501' }), false);
  env.NODE_ENV = 'production';
  assert.equal(canUseDemoFixture(new Error('Supabase RPC unavailable')), false);
  if (originalNodeEnv === undefined) delete env.NODE_ENV;
  else env.NODE_ENV = originalNodeEnv;
});
