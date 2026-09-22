import test from 'node:test';
import assert from 'node:assert/strict';
import { POST, clientAddress, rateLimitKey } from './route.ts';

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
  const request = new Request('http://localhost');
  assert.equal(clientAddress(request), 'unknown');
  const platform = new Request('http://localhost', { headers: { 'x-vercel-forwarded-for': '203.0.113.1, 10.0.0.1' } });
  assert.equal(clientAddress(platform), '203.0.113.1');
  assert.notEqual(rateLimitKey(platform, 'visitor-a', 'page_view'), rateLimitKey(platform, 'visitor-b', 'page_view'));
});
