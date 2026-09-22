const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { load } = require('./test-loader.cjs');

function request() {
  return new Request('https://example.com/api/admin/outreach/campaigns/local/send-test', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ campaignId: 'campaign-1', contactId: 'contact-1', name: 'Ada Lovelace', studio: 'Analytical Engines', country: 'Sweden', website: 'https://example.com', to: 'ada@example.com', subject: 'Hello', html: '<p>Hello</p>', text: 'Hello' }),
  });
}

test('reports an accepted email when delivery tracking is unavailable', async () => {
  const route = load('app/api/admin/outreach/campaigns/[id]/send-test/route.ts', {
    '@/lib/outreach/auth': { requireOutreachAdmin: async () => ({ client: {}, user: { id: 'admin-1' } }) },
    '@/lib/outreach/providers': { getOutreachProvider: () => ({ send: async () => ({ providerMessageId: 'resend-message-1' }) }) },
    '@/lib/stripe': { serviceClient: () => { throw new Error('delivery database unavailable'); } },
  });
  const response = await route.POST(request());
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.providerMessageId, 'resend-message-1');
  assert.equal(body.deliveryId, null);
  assert.equal(body.trackingError, 'Email accepted, but delivery tracking could not be recorded.');
});

test('completed campaign navigates directly to the delivery report', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../app/admin/outreach/campaigns/new/final/FinalPreview.tsx'), 'utf8');
  assert.match(source, /useRouter\(\)/);
  assert.match(source, /router\.push\('\/admin\/outreach\/report'\)/);
});
