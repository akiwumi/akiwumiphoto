const { test } = require('node:test'); const assert = require('node:assert/strict'); const { load } = require('./test-loader.cjs');
const fs = require('node:fs');
const path = require('node:path');

test('production webhook setup subscribes to engagement and failure events', () => {
  const setup = fs.readFileSync(path.resolve(__dirname, '../OUTREACH_EMAIL_DELIVERY_SETUP.md'), 'utf8');
  for (const event of ['email.sent', 'email.delivered', 'email.opened', 'email.clicked', 'email.bounced', 'email.failed']) {
    assert.match(setup, new RegExp('`' + event.replace('.', '\\.') + '`'));
  }
});

test('mock provider returns deterministic message id and stores multipart content', async () => { const { MockOutreachProvider, mockSentMessages } = load('lib/outreach/providers/mock.ts'); const provider = new MockOutreachProvider(); const result = await provider.send({ to: 'a@example.com', from: 'from@example.com', replyTo: 'reply@example.com', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi' }); assert.match(result.providerMessageId, /^mock-/); assert.equal(mockSentMessages.at(-1).text, 'Hi'); });
test('Resend provider reads the authoritative delivery event', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({ id: 'msg-1', last_event: 'delivered' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  try {
    const { createResendProvider } = load('lib/outreach/providers/resend.ts');
    assert.equal(await createResendProvider('re_test').getStatus?.('msg-1'), 'delivered');
  } finally {
    global.fetch = originalFetch;
  }
});

test('delivery report reconciles an open after delivery from the provider', async () => {
  const updates = [];
  const client = {
    from(table) {
      if (table === 'outreach_deliveries') {
        return {
          select: () => ({ order: async () => ({ data: [{ id: 'delivery-1', provider_message_id: 'message-1', status: 'delivered', rendered_subject: 'Hello', sent_at: null, delivered_at: '2026-09-21T10:00:00.000Z', opened_at: null, clicked_at: null, bounced_at: null, error_message: null, outreach_contacts: { email: 'a@example.com', first_name: 'Ada', last_name: 'Lovelace', company_name: 'Analytical Engines' }, outreach_campaigns: { name: 'September' }, outreach_events: [] }], error: null }) }),
          update: (value) => ({ eq: async () => { updates.push(value); return { error: null }; } }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };
  const { getDeliveryReport } = load('lib/outreach/delivery-report.ts', {
    '@/lib/stripe': { serviceClient: () => client },
    '@/lib/outreach/providers': { getOutreachProvider: () => ({ getStatus: async () => 'opened' }) },
  });
  const previousProvider = process.env.OUTREACH_PROVIDER;
  const previousKey = process.env.RESEND_API_KEY;
  process.env.OUTREACH_PROVIDER = 'resend';
  process.env.RESEND_API_KEY = 're_test';
  try {
    const [row] = await getDeliveryReport();
    assert.equal(row.status, 'opened');
    assert.equal(updates[0].status, 'opened');
  } finally {
    if (previousProvider === undefined) delete process.env.OUTREACH_PROVIDER; else process.env.OUTREACH_PROVIDER = previousProvider;
    if (previousKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = previousKey;
  }
});
