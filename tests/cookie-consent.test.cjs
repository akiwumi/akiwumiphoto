const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { load } = require('./test-loader.cjs');

const { COOKIE_CONSENT_MAX_AGE_MS, getConsentStatus, parseConsentPreference } = load('lib/cookie-consent.ts');

function source(file) {
  return fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
}

test('accepts an unexpired analytics choice', () => {
  const now = Date.UTC(2026, 8, 22);
  assert.equal(parseConsentPreference(JSON.stringify({ analytics: true, decidedAt: now }), now), 'accepted');
});

test('treats expired and malformed preferences as unresolved', () => {
  const now = Date.UTC(2026, 8, 22);
  assert.equal(parseConsentPreference(JSON.stringify({ analytics: false, decidedAt: now - COOKIE_CONSENT_MAX_AGE_MS - 1 }), now), 'unresolved');
  assert.equal(parseConsentPreference('{not json}', now), 'unresolved');
});

test('uses unresolved consent when storage cannot be read', () => {
  assert.equal(getConsentStatus(null), 'unresolved');
  assert.equal(getConsentStatus({ getItem() { throw new Error('blocked'); } }), 'unresolved');
});

test('analytics is gated by explicit consent', () => {
  const analytics = source('components/AnalyticsTracker.tsx');
  assert.match(analytics, /useCookieConsent/);
  assert.match(analytics, /status !== 'accepted'/);
});

test('shared footer offers cookie settings', () => {
  assert.match(source('components/SiteFooter.tsx'), /Cookie settings/);
});

test('cookie policy states categories, provider, retention, and contact route', () => {
  const policy = source('app/cookie-policy/page.tsx');
  assert.match(policy, /Essential cookies/);
  assert.match(policy, /first-party analytics/);
  assert.match(policy, /Supabase database/);
  assert.match(policy, /pseudonymous persistent browser identifier/);
  assert.match(policy, /one-way hash/);
  assert.match(policy, /No direct identity fields/);
  assert.match(policy, /local storage/);
  assert.match(policy, /consent again/);
  assert.match(policy, /withdraw/);
  assert.match(policy, /six months/i);
  assert.match(policy, /href="\/contact"/);
});
