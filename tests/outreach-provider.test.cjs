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

test('Resend provider reconciles a batch from one sent-email log request', async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    assert.match(String(url), /\/emails\?limit=100/);
    return new Response(JSON.stringify({ has_more: false, data: [
      { id: 'message-1', last_event: 'delivered' },
      { id: 'message-2', last_event: 'clicked' },
    ] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const { createResendProvider } = load('lib/outreach/providers/resend.ts');
    const statuses = await createResendProvider('re_test').getStatuses?.(['message-1', 'message-2']);
    assert.equal(statuses?.get('message-1'), 'delivered');
    assert.equal(statuses?.get('message-2'), 'clicked');
  } finally { global.fetch = originalFetch; }
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

test('delivery report uses a batch provider reconciliation when available', async () => {
  let requestedIds = [];
  const { getDeliveryReport } = load('lib/outreach/delivery-report.ts', {
    '@/lib/stripe': { serviceClient: () => ({ from: () => ({ select: () => ({ order: async () => ({ data: [{ id: 'delivery-1', provider_message_id: 'message-1', status: 'submitted', rendered_subject: 'Hello', sent_at: null, delivered_at: null, opened_at: null, clicked_at: null, bounced_at: null, error_message: null, outreach_contacts: { email: 'a@example.com', first_name: 'Ada', last_name: 'Lovelace', company_name: 'Analytical Engines' }, outreach_campaigns: { name: 'September' }, outreach_events: [] }], error: null }) }), update: () => ({ eq: async () => ({ error: null }) }) }) }) },
    '@/lib/outreach/providers': { getOutreachProvider: () => ({ getStatuses: async (ids) => { requestedIds = ids; return new Map([['message-1', 'clicked']]); } }) },
    '@/lib/outreach/domain': { effectiveDeliveryStatus: (current, events) => events.at(-1) ?? current },
  });
  const previousProvider = process.env.OUTREACH_PROVIDER;
  const previousKey = process.env.RESEND_API_KEY;
  process.env.OUTREACH_PROVIDER = 'resend'; process.env.RESEND_API_KEY = 're_test';
  try {
    const [row] = await getDeliveryReport();
    assert.deepEqual(requestedIds, ['message-1']);
    assert.equal(row.status, 'clicked');
  } finally {
    if (previousProvider === undefined) delete process.env.OUTREACH_PROVIDER; else process.env.OUTREACH_PROVIDER = previousProvider;
    if (previousKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = previousKey;
  }
});

test('delivery report helpers derive countries and combine country/category/status filters', () => {
  const { deliveryReportCountries, filterDeliveryReportRows } = load('lib/outreach/delivery-report.ts', {
    '@/lib/stripe': { serviceClient: () => ({}) },
    '@/lib/outreach/domain': { effectiveDeliveryStatus: (status) => status },
    '@/lib/outreach/providers': {},
  });
  const rows = [
    { id: '1', email: 'a@example.com', country: 'Sweden', category: 'Galleries', status: 'delivered', sentAt: '2026-09-20T10:00:00Z' },
    { id: '2', email: 'b@example.com', country: 'Germany', category: null, status: 'bounced', sentAt: '2026-09-21T10:00:00Z' },
    { id: '3', email: 'c@example.com', country: 'Germany', category: 'Galleries', status: 'delivered', sentAt: '2026-09-22T10:00:00Z' },
  ];
  assert.deepEqual(deliveryReportCountries(rows), ['Germany', 'Sweden']);
  assert.deepEqual(filterDeliveryReportRows(rows, { country: 'Germany', category: 'Galleries', status: 'delivered' }).map((row) => row.id), ['3']);
  assert.deepEqual(filterDeliveryReportRows(rows, { country: 'Germany', category: 'Uncategorised', status: 'all' }).map((row) => row.id), ['2']);
  assert.deepEqual(filterDeliveryReportRows(rows, { country: '', status: 'all' }).map((row) => row.id), ['1', '2', '3']);
});

test('delivery report maps a joined contact category and normalizes missing categories', async () => {
  const client = {
    from(table) {
      assert.equal(table, 'outreach_deliveries');
      return { select: () => ({ order: async () => ({ error: null, data: [
        { id: 'delivery-1', provider_message_id: null, status: 'delivered', rendered_subject: 'Hi', sent_at: null, delivered_at: null, opened_at: null, clicked_at: null, bounced_at: null, error_message: null, outreach_contacts: { email: 'a@example.com', first_name: 'Ada', last_name: 'Lovelace', company_name: 'Analytical Engines', country: 'Sweden', outreach_contact_categories: { name: 'Galleries' } }, outreach_campaigns: { name: 'Campaign' }, outreach_events: [] },
        { id: 'delivery-2', provider_message_id: null, status: 'delivered', rendered_subject: 'Hi', sent_at: null, delivered_at: null, opened_at: null, clicked_at: null, bounced_at: null, error_message: null, outreach_contacts: { email: 'b@example.com', first_name: 'Grace', last_name: 'Hopper', company_name: null, country: null, outreach_contact_categories: null }, outreach_campaigns: { name: 'Campaign' }, outreach_events: [] },
      ] }) }) };
    },
  };
  const { getDeliveryReport } = load('lib/outreach/delivery-report.ts', {
    '@/lib/stripe': { serviceClient: () => client },
    '@/lib/outreach/domain': { effectiveDeliveryStatus: (status) => status },
    '@/lib/outreach/providers': {},
  });
  const rows = await getDeliveryReport();
  assert.deepEqual(rows.map((row) => row.category), ['Galleries', 'Uncategorised']);
});
