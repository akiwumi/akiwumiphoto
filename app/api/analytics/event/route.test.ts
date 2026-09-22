import test from 'node:test';
import assert from 'node:assert/strict';
import { POST } from './route.ts';

test('safely ignores requests without analytics consent', async () => {
  const response = await POST(new Request('http://localhost/api/analytics/event', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0' },
    body: JSON.stringify({ eventName: 'page_view', path: '/', visitorToken: 'opaque-token-123456' }),
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});
