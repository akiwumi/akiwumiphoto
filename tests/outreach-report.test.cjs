const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./test-loader.cjs');

function request(body) {
  return new Request('https://example.com/api/admin/outreach/report', {
    method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}

test('rejects an empty or oversized delivery deletion list', async () => {
  const route = load('app/api/admin/outreach/report/route.ts', { '@/lib/outreach/auth': { requireOutreachAdmin: async () => ({}) } });
  assert.equal((await route.DELETE(request({ ids: [] }))).status, 422);
  assert.equal((await route.DELETE(request({ ids: Array.from({ length: 201 }, (_, i) => `id-${i}`) }))).status, 422);
});

test('deletes only unique requested deliveries after admin authorization', async () => {
  let deleted;
  const route = load('app/api/admin/outreach/report/route.ts', {
    '@/lib/outreach/auth': { requireOutreachAdmin: async () => ({}) },
    '@/lib/stripe': { serviceClient: () => ({ from: (table) => { assert.equal(table, 'outreach_deliveries'); return { delete: () => ({ in: async (column, ids) => { deleted = { column, ids }; return { error: null }; } }) }; } }) },
  });
  const response = await route.DELETE(request({ ids: [' delivery-1 ', 'delivery-1', 'delivery-2'] }));
  assert.equal(response.status, 200);
  assert.deepEqual(deleted, { column: 'id', ids: ['delivery-1', 'delivery-2'] });
});

test('returns an error without deleting when the database rejects the request', async () => {
  const route = load('app/api/admin/outreach/report/route.ts', {
    '@/lib/outreach/auth': { requireOutreachAdmin: async () => ({}) },
    '@/lib/stripe': { serviceClient: () => ({ from: () => ({ delete: () => ({ in: async () => ({ error: { message: 'database unavailable' } }) }) }) }) },
  });
  const response = await route.DELETE(request({ ids: ['delivery-1'] }));
  assert.equal(response.status, 500);
  assert.match((await response.json()).error, /database unavailable/i);
});

test('returns 403 when outreach admin authorization fails', async () => {
  const route = load('app/api/admin/outreach/report/route.ts', { '@/lib/outreach/auth': { requireOutreachAdmin: async () => { throw new Error('OUTREACH_UNAUTHORIZED'); } } });
  assert.equal((await route.DELETE(request({ ids: ['delivery-1'] }))).status, 403);
});
