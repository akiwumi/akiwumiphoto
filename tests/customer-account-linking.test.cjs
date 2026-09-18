const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function load(relative, mocks = {}) {
  const file = path.resolve(__dirname, '..', relative);
  const loaded = new Module(file, module);
  loaded.require = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith('@/')) {
      const target = path.resolve(__dirname, '..', name.slice(2));
      return load(path.relative(path.resolve(__dirname, '..'), target) + '.ts', mocks);
    }
    return require(name);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, file);
  return loaded.exports;
}

function request() {
  return new Request('https://example.com/api/stripe/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': 'test' },
    body: '{}',
  });
}

function setup(provisioning = { userId: 'a40d7f72-1021-4f41-83d0-989afc731111' }) {
  const calls = [];
  const order = {
    id: 'order-1', reference: 'AP-260919-ABCDE', lines: [], total_usd: 100,
    first_name: 'Ada', last_name: 'Test', email: 'ada@example.com', phone: null,
    country: 'Sweden', currency: 'SEK', exchange_rate: 10, status: 'paid',
    hold_expires_at: null, stripe_session_id: 'cs_test', shipping_usd: 0,
    shipping_address: null, paid_at: new Date().toISOString(), created_at: new Date().toISOString(),
  };
  const service = {
    rpc: async (name, args) => {
      calls.push([name, args]);
      if (name === 'mark_print_order_paid') return { data: order, error: null };
      return { data: { linked: true }, error: null };
    },
  };
  const route = load('app/api/stripe/webhook/route.ts', {
    '@/lib/stripe': {
      stripe: () => ({ webhooks: { constructEvent: () => ({
        id: 'evt_test', type: 'checkout.session.completed',
        data: { object: {
          id: 'cs_test', payment_status: 'paid', currency: 'sek', amount_total: 100000,
          metadata: {}, collected_information: null, customer_details: null,
        } },
      }) } }),
      serviceClient: () => service,
    },
    '@/lib/order-email': { sendOrderNotification: async () => {} },
    '@/lib/shipping': { shippingUsdForSession: () => 0 },
    '@/lib/account-provisioning': {
      provisionCustomerAccount: async () => {
        calls.push(['provisionCustomerAccount', { email: order.email }]);
        if (provisioning.error) throw new Error('Auth unavailable');
        return provisioning.userId;
      },
      linkPaidOrderToAccount: async (orderId, userId) => calls.push(['linkPaidOrderToAccount', { orderId, userId }]),
    },
  });
  return { route, calls };
}

test('paid checkout provisions and links the buyer account after settlement', async () => {
  const userId = 'a40d7f72-1021-4f41-83d0-989afc731111';
  const { route, calls } = setup({ userId });
  const previousSecret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = 'test-secret';
  const response = await route.POST(request());
  if (previousSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
  else process.env.STRIPE_WEBHOOK_SECRET = previousSecret;
  assert.equal(response.status, 200);
  assert.deepEqual(calls.map(([name]) => name), ['mark_print_order_paid', 'provisionCustomerAccount', 'linkPaidOrderToAccount']);
  assert.deepEqual(calls[2][1], { orderId: 'order-1', userId });
});

test('Auth provisioning failure does not fail an already settled webhook', async () => {
  const { route, calls } = setup({ error: true });
  const previousSecret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = 'test-secret';
  const response = await route.POST(request());
  if (previousSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
  else process.env.STRIPE_WEBHOOK_SECRET = previousSecret;
  assert.equal(response.status, 200);
  assert.deepEqual(calls.map(([name]) => name), ['mark_print_order_paid', 'provisionCustomerAccount']);
});

test('account provisioning reuses an unverified user and resends confirmation', async () => {
  const calls = [];
  const route = load('lib/account-provisioning.ts', {
    '@/lib/stripe': { serviceClient: () => ({ auth: {
      admin: { listUsers: async () => ({ data: { users: [{ id: 'u1', email: 'ada@example.com', email_confirmed_at: null }] }, error: null }) },
      resend: async (args) => { calls.push(args); return { error: null }; },
    } }) },
    '@/lib/site-origin': { SITE_URL: 'https://example.com' },
  });
  assert.equal(await route.provisionCustomerAccount(' Ada@Example.COM '), 'u1');
  assert.equal(calls[0].email, 'ada@example.com');
  assert.equal(calls[0].options.emailRedirectTo, 'https://example.com/auth/confirm?next=%2Faccount');
});

test('account provisioning invites a first-time buyer', async () => {
  const calls = [];
  const route = load('lib/account-provisioning.ts', {
    '@/lib/stripe': { serviceClient: () => ({ auth: {
      admin: {
        listUsers: async () => ({ data: { users: [] }, error: null }),
        inviteUserByEmail: async (...args) => { calls.push(args); return { data: { user: { id: 'u2' } }, error: null }; },
      },
      resend: async () => ({ error: null }),
    } }) },
    '@/lib/site-origin': { SITE_URL: 'https://example.com' },
  });
  assert.equal(await route.provisionCustomerAccount(' New@Example.COM '), 'u2');
  assert.equal(calls[0][0], 'new@example.com');
  assert.equal(calls[0][1].redirectTo, 'https://example.com/auth/confirm?next=%2Faccount');
});
