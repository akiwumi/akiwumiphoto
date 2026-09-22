import test from 'node:test';
import assert from 'node:assert/strict';
import { createDedupeKey, hashVisitorToken, normalizeAnalyticsEvent, normalizeDeviceClass, normalizePath, normalizeReferrer, sanitizeMetadata } from './analytics.ts';

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
