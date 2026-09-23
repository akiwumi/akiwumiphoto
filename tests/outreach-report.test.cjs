const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { load } = require('./test-loader.cjs');

function request(body) {
  return new Request('https://example.com/api/admin/outreach/report', {
    method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}

function reportRoute(mocks = {}) {
  return load('app/api/admin/outreach/report/route.ts', {
    '@/lib/outreach/delivery-report': { getDeliveryReport: async () => [] },
    ...mocks,
  });
}

test('delivery report refreshes reconciled rows while the page is visible', () => {
  const table = fs.readFileSync(path.resolve(__dirname, '../app/admin/outreach/report/DeliveryReportTable.tsx'), 'utf8');
  assert.match(table, /\/api\/admin\/outreach\/report/);
  assert.match(table, /setInterval/);
  assert.match(table, /visibilitychange/);
  assert.match(table, /Category/);
  assert.match(table, /category/);
});

test('returns freshly reconciled report rows for live refreshes', async () => {
  const rows = [{ id: 'delivery-1', status: 'opened' }];
  const route = reportRoute({
    '@/lib/outreach/auth': { requireOutreachAdmin: async () => ({}) },
    '@/lib/outreach/delivery-report': { getDeliveryReport: async () => rows },
  });
  const response = await route.GET();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { rows });
});

test('rejects an empty or oversized delivery deletion list', async () => {
  const route = reportRoute({ '@/lib/outreach/auth': { requireOutreachAdmin: async () => ({}) } });
  assert.equal((await route.DELETE(request({ ids: [] }))).status, 422);
  assert.equal((await route.DELETE(request({ ids: Array.from({ length: 201 }, (_, i) => `id-${i}`) }))).status, 422);
});

test('rejects delivery IDs that are not UUIDs', async () => {
  const route = reportRoute({ '@/lib/outreach/auth': { requireOutreachAdmin: async () => ({}) } });
  const response = await route.DELETE(request({ ids: ['delivery-1'] }));
  assert.equal(response.status, 422);
});

test('deletes only unique requested deliveries after admin authorization', async () => {
  let deleted;
  const route = reportRoute({
    '@/lib/outreach/auth': { requireOutreachAdmin: async () => ({}) },
    '@/lib/stripe': { serviceClient: () => ({ from: (table) => { assert.equal(table, 'outreach_deliveries'); return { delete: () => ({ in: async (column, ids) => { deleted = { column, ids }; return { error: null }; } }) }; } }) },
  });
  const response = await route.DELETE(request({ ids: [' 00000000-0000-0000-0000-000000000001 ', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'] }));
  assert.equal(response.status, 200);
  assert.deepEqual(deleted, { column: 'id', ids: ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'] });
});

test('returns an error without deleting when the database rejects the request', async () => {
  const route = reportRoute({
    '@/lib/outreach/auth': { requireOutreachAdmin: async () => ({}) },
    '@/lib/stripe': { serviceClient: () => ({ from: () => ({ delete: () => ({ in: async () => ({ error: { message: 'database unavailable' } }) }) }) }) },
  });
  const response = await route.DELETE(request({ ids: ['00000000-0000-0000-0000-000000000001'] }));
  assert.equal(response.status, 500);
  assert.equal((await response.json()).error, 'Unable to erase delivery records.');
});

test('returns a controlled 500 when the service client throws', async () => {
  const route = reportRoute({
    '@/lib/outreach/auth': { requireOutreachAdmin: async () => ({}) },
    '@/lib/stripe': { serviceClient: () => { throw new Error('service client unavailable'); } },
  });
  const response = await route.DELETE(request({ ids: ['00000000-0000-0000-0000-000000000001'] }));
  assert.equal(response.status, 500);
  assert.equal((await response.json()).error, 'Unable to erase delivery records.');
});

test('returns 403 when outreach admin authorization fails', async () => {
  const route = reportRoute({ '@/lib/outreach/auth': { requireOutreachAdmin: async () => { throw new Error('OUTREACH_UNAUTHORIZED'); } } });
  assert.equal((await route.DELETE(request({ ids: ['00000000-0000-0000-0000-000000000001'] }))).status, 403);
});
