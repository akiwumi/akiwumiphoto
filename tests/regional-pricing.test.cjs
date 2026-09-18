const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');

function load(relative, mocks = {}, cache = new Map()) {
  const file = path.resolve(__dirname, '..', relative);
  if (cache.has(file)) return cache.get(file).exports;
  const loaded = new Module(file, module);
  cache.set(file, loaded);
  loaded.require = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith('.') || name.startsWith('@/')) {
      const target = name.startsWith('@/') ? path.resolve(__dirname, '..', name.slice(2)) : path.resolve(path.dirname(file), name);
      return load(path.relative(path.resolve(__dirname, '..'), target) + '.ts', mocks, cache);
    }
    return require(name);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, file);
  return loaded.exports;
}
module.exports = { load };

const rates = { date: '2026-09-18', rates: { USD: 1, EUR: 0.8, GBP: 0.75, SEK: 10, JPY: 150 } };
test('shipping follows delivery country, separating UK and non-EU Europe', () => {
  const { shippingFor } = load('lib/shipping.ts');
  for (const [country, amount, currency] of [['SE', 0, 'SEK'], ['GB', 30, 'GBP'], ['DE', 25, 'EUR'], ['DK', 25, 'EUR'], ['NO', 45, 'USD'], ['CH', 45, 'USD'], ['US', 45, 'USD']]) {
    const actual = shippingFor(country);
    assert.equal(actual.amount, amount, country);
    assert.equal(actual.currency, currency, country);
  }
});
test('currency defaults use country, not language or eurozone membership', () => {
  const { currencyForCountry } = load('lib/regions.ts');
  assert.equal(currencyForCountry('SE'), 'SEK');
  assert.equal(currencyForCountry('gb'), 'GBP');
  for (const country of 'AT BE BG CY CZ DE DK EE ES FI FR GR HR HU IE IT LT LU LV MT NL PL PT RO SI SK'.split(' ')) assert.equal(currencyForCountry(country), 'EUR', country);
  for (const country of ['US', 'NO', 'CH', 'IS', 'LI', null, 'XX']) assert.equal(currencyForCountry(country), 'USD');
});
test('shipping native fees stay exact; cross-currency fees convert once', () => {
  const { shippingQuote } = load('lib/shipping.ts');
  assert.equal(shippingQuote('GB', 'GBP', rates).minorAmount, 3000);
  assert.equal(shippingQuote('DE', 'EUR', rates).minorAmount, 2500);
  assert.equal(shippingQuote('GB', 'SEK', rates).minorAmount, 40000);
  assert.equal(shippingQuote('US', 'EUR', rates).minorAmount, 3600);
  assert.equal(shippingQuote('SE', 'USD', { rates: { USD: 1 } }).minorAmount, 0);
  assert.equal(shippingQuote('DE', 'USD', { rates: { USD: 1 } }), null);
  assert.equal(shippingQuote('GB', 'GBP', { rates: { USD: 1, GBP: Infinity } }), null);
});
test('minor-unit conversion handles yen and per-unit rounding', () => {
  const { toMinorUnits, fromMinorUnits } = load('lib/currency.ts');
  assert.equal(toMinorUnits(123.45, 'JPY'), 123);
  assert.equal(toMinorUnits(12.345, 'EUR'), 1235);
  assert.equal(fromMinorUnits(3000, 'GBP'), 30);
});

test('paid order email preserves cents in charged and USD shipping amounts', () => {
  const { orderEmailText } = load('lib/order-email.ts', { './site-origin': { SITE_URL: 'https://example.com' } });
  const text = orderEmailText({ reference: 'AP-260918-ABCDE', lines: [], total_usd: 100,
    first_name: 'Ada', last_name: 'Test', email: 'ada@example.com', country: 'UK', currency: 'GBP',
    exchange_rate: 0.75, created_at: new Date('2026-09-18T12:00:00Z'),
    paid: { amount: 10501, currency: 'gbp', shipping_usd: 40.01, address: null } });
  assert.match(text, /£105\.01 including shipping/);
  assert.match(text, /SHIPPING: \$40\.01 USD/);
});
test('webhook uses USD snapshot and rejects mismatched delivery or amount', () => {
  const { shippingUsdForSession } = load('lib/shipping.ts');
  const session = { currency: 'gbp', shipping_cost: { amount_total: 3000 }, collected_information: { shipping_details: { address: { country: 'GB' } } }, metadata: { shipping_quote_version: '1', shipping_country: 'GB', shipping_currency: 'GBP', shipping_minor: '3000', shipping_usd: '40' } };
  assert.equal(shippingUsdForSession(session), 40);
  assert.throws(() => shippingUsdForSession({ ...session, shipping_cost: { amount_total: 1 } }));
  assert.throws(() => shippingUsdForSession({ ...session, collected_information: { shipping_details: { address: { country: 'SE' } } } }));
  assert.equal(shippingUsdForSession({ currency: 'usd', shipping_cost: { amount_total: 4500 } }), 45);
});

test('checkout charges one destination fee and restricts the actual delivery address', async () => {
  for (const [country, currency, expected] of [['SE', 'SEK', 0], ['GB', 'GBP', 3000], ['FR', 'EUR', 2500], ['NO', 'USD', 4500], ['US', 'USD', 4500], ['GB', 'SEK', 40000], ['JP', 'JPY', 6750]]) {
    let captured;
    const route = load('app/api/print-orders/route.ts', {
      '@/lib/print-shop': { publicClient: () => ({ rpc: async () => ({ data: { reference: 'AP-260918-ABCDE', lines: [{ quantity: 3, unit_price_usd: 101.23, gallery_title: 'Test', position: 1, size_name: 'A4' }], total_usd: 303.69 }, error: null }) }) },
      '@/lib/exchange-rates': { getExchangeRates: async () => rates },
      '@/lib/stripe': {
        stripe: () => ({ checkout: { sessions: { create: async (params) => { captured = params; return { id: 'cs_test', url: 'https://checkout.stripe.com/test' }; } } } }),
        serviceClient: () => ({ from: () => ({ update: () => ({ eq: async () => ({ error: null }) }) }) }),
      },
      '@/lib/site-origin': { siteOrigin: () => 'https://example.com' },
    });
    const response = await route.POST(new Request('https://example.com/api/print-orders', { method: 'POST', body: JSON.stringify({ customer: { firstName: 'Ada', lastName: 'Test', email: 'ada@example.com', country }, currency, shipping: 0, items: [{ imageId: 'a', sizeId: 'b', quantity: 3 }] }) }));
    assert.equal(response.status, 200, `${country} ${currency}`);
    assert.deepEqual(captured.shipping_address_collection.allowed_countries, [country]);
    assert.equal(captured.shipping_options.length, 1);
    assert.deepEqual(captured.shipping_options[0].shipping_rate_data.fixed_amount, { amount: expected, currency: currency.toLowerCase() });
    assert.equal(captured.line_items[0].price_data.currency, currency.toLowerCase());
    assert.equal(captured.line_items[0].price_data.unit_amount, Math.round(101.23 * rates.rates[currency] * (currency === 'JPY' ? 1 : 100)));
    assert.equal(captured.adaptive_pricing.enabled, false);
    assert.equal(captured.metadata.shipping_country, country);
    assert.match(captured.custom_text.shipping_address.message, /7 working days/);
  }
});

test('checkout rejects invalid countries and missing rates before reserving prints', async () => {
  let reserved = 0;
  const route = load('app/api/print-orders/route.ts', {
    '@/lib/print-shop': { publicClient: () => ({ rpc: async () => { reserved++; throw new Error('must not reserve'); } }) },
    '@/lib/exchange-rates': { getExchangeRates: async () => ({ date: null, rates: { USD: 1 } }) },
    '@/lib/stripe': {}, '@/lib/site-origin': {},
  });
  for (const [country, currency, status] of [['XX', 'USD', 422], ['GB', 'USD', 503], ['SE', 'SEK', 503]]) {
    const response = await route.POST(new Request('https://example.com/api/print-orders', { method: 'POST', body: JSON.stringify({ customer: { country }, currency, items: [{ imageId: 'a', sizeId: 'b', quantity: 1 }] }) }));
    assert.equal(response.status, status);
  }
  assert.equal(reserved, 0);
});

test('location endpoint is private and defaults unknown countries to USD', async () => {
  const { GET } = load('app/api/location/route.ts');
  for (const [country, currency] of [['SE', 'SEK'], ['GB', 'GBP'], ['DE', 'EUR'], ['NO', 'USD'], ['', 'USD']]) {
    const response = GET(new Request('https://example.com/api/location', { headers: { 'x-vercel-ip-country': country } }));
    assert.deepEqual(await response.json(), { currency });
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  }
});

test('location endpoint accepts country headers used by common hosts and proxies', async () => {
  const { GET } = load('app/api/location/route.ts');
  for (const [header, country, currency] of [['cf-ipcountry', 'GB', 'GBP'], ['cloudfront-viewer-country', 'DE', 'EUR'], ['x-country-code', 'SE', 'SEK']]) {
    const response = GET(new Request('https://example.com/api/location', { headers: { [header]: country } }));
    assert.deepEqual(await response.json(), { currency });
  }
});

test('location defaults never override a saved choice or a choice made during detection', async () => {
  const oldWindow = global.window;
  const oldFetch = global.fetch;
  try {
    for (const [saved, manual, expected] of [[null, null, 'SEK'], ['GBP', null, 'GBP'], [null, 'EUR', 'EUR']]) {
      let finishLocation;
      let subscribe;
      const storage = new Map(saved ? [['akiwumi-currency', saved]] : []);
      global.window = { localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }, addEventListener() {}, removeEventListener() {} };
      global.fetch = () => new Promise((resolve) => { finishLocation = resolve; });
      const store = load('lib/basket-store.ts', { react: { useSyncExternalStore: (sub, snapshot) => { subscribe = sub; return snapshot(); } } });
      store.useChosenCurrency();
      const unsubscribe = subscribe(() => {});
      if (manual) store.setCurrency(manual);
      finishLocation({ ok: true, json: async () => ({ currency: 'SEK' }) });
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(store.useChosenCurrency(), expected);
      unsubscribe();
    }
  } finally { global.window = oldWindow; global.fetch = oldFetch; }
});
