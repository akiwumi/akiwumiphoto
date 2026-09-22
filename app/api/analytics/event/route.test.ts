import test from 'node:test';
import assert from 'node:assert/strict';
import { POST, clientAddress, rateLimitKey, setAnalyticsServiceClientForTest } from './route.ts';
import { hashVisitorToken } from '../../../../lib/analytics.ts';

test('safely ignores requests without analytics consent', async () => {
  const response = await POST(new Request('http://localhost/api/analytics/event', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0' },
    body: JSON.stringify({ eventName: 'page_view', path: '/', visitorToken: 'opaque-token-123456' }),
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});

test('rejects oversized UTF-8 payloads and excludes bots/admin paths', async () => {
  const oversized = await POST(new Request('http://localhost/api/analytics/event', {
    method: 'POST',
    headers: { 'x-analytics-consent': 'accepted' },
    // Deliberately omit Content-Length: this must be rejected by the actual
    // UTF-8 byte count, not by a client-provided size declaration.
    body: JSON.stringify({ consent: true, eventName: 'page_view', path: '/', visitorToken: 'opaque-token-123456', metadata: { category: '😀'.repeat(5_000) } }),
  }));
  assert.deepEqual(await oversized.json(), { ok: true });
  const ignored = async (userAgent: string, path: string) => POST(new Request('http://localhost/api/analytics/event', {
    method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': userAgent },
    body: JSON.stringify({ consent: true, eventName: 'page_view', path, visitorToken: 'opaque-token-123456' }),
  }));
  assert.deepEqual(await (await ignored('Googlebot/2.1', '/')).json(), { ok: true });
  assert.deepEqual(await (await ignored('Mozilla/5.0', '/admin')).json(), { ok: true });
  assert.deepEqual(await (await ignored('Mozilla/5.0', '/auth/login')).json(), { ok: true });
});

test('uses only trusted client address headers for rate buckets', () => {
  const priorVercel = process.env.VERCEL;
  delete process.env.VERCEL;
  const request = new Request('http://localhost');
  assert.equal(clientAddress(request), 'unknown');
  const platform = new Request('http://localhost', { headers: { 'x-vercel-forwarded-for': '203.0.113.1, 10.0.0.1' } });
  assert.equal(clientAddress(platform), 'unknown');
  process.env.VERCEL = '1';
  assert.equal(clientAddress(platform), '203.0.113.1');
  assert.equal(rateLimitKey(platform, 'page_view'), rateLimitKey(platform, 'page_view'));
  if (priorVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = priorVercel;
});

test('unknown client addresses are rejected before insertion', async () => {
  const request = new Request('http://localhost');
  assert.equal(clientAddress(request), 'unknown');
  const response = await POST(new Request('http://localhost/api/analytics/event', {
    method: 'POST', headers: { 'x-analytics-consent': 'accepted' },
    body: JSON.stringify({ consent: true, eventName: 'page_view', path: '/', visitorToken: 'opaque-token-123456' }),
  }));
  assert.deepEqual(await response.json(), { ok: true });
});

test('inserts a normalized event through the service client', async () => {
  let inserted: Record<string, unknown> | null = null;
  const mock = { from: () => ({ insert: async (payload: Record<string, unknown>) => { inserted = payload; return { error: null }; } }) } as unknown as import('@supabase/supabase-js').SupabaseClient;
  const priorVercel = process.env.VERCEL;
  process.env.VERCEL = '1';
  setAnalyticsServiceClientForTest(mock);
  try {
    const response = await POST(new Request('http://localhost/api/analytics/event', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-analytics-consent': 'accepted', 'user-agent': 'Mozilla/5.0', 'x-vercel-forwarded-for': '203.0.113.7' },
      body: JSON.stringify({ eventName: 'gallery_view', path: '/gallery/forest', visitorToken: 'opaque-token-123456', metadata: { gallerySlug: 'forest' } }),
    }));
    assert.deepEqual(await response.json(), { ok: true });
    const saved = inserted as unknown as Record<string, unknown>;
    assert.equal(saved.event_name, 'gallery_view');
    assert.equal(saved.path, '/gallery/forest');
  } finally {
    setAnalyticsServiceClientForTest(null);
    if (priorVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = priorVercel;
  }
});

test('hashing fails closed outside explicit development/test mode', () => {
  const env = process.env as Record<string, string | undefined>;
  const priorNodeEnv = process.env.NODE_ENV;
  const priorHash = process.env.ANALYTICS_HASH_SECRET;
  const priorService = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.ANALYTICS_HASH_SECRET;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  env.NODE_ENV = 'production';
  assert.throws(() => hashVisitorToken('opaque-token-123456'), /hash secret/i);
  env.NODE_ENV = priorNodeEnv;
  if (priorHash === undefined) delete process.env.ANALYTICS_HASH_SECRET; else process.env.ANALYTICS_HASH_SECRET = priorHash;
  if (priorService === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = priorService;
});
