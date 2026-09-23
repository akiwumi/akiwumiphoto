const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { load } = require('./test-loader.cjs');

const { categoryLabel, categoryKey, filterByCategories, trimCategoryName } = load('lib/outreach/categories.ts');

test('normalizes ASCII-whitespace category names with deterministic casing', () => {
  assert.equal(trimCategoryName('\t Galleries \r\n'), 'Galleries');
  assert.equal(categoryKey('  GALLERIES  '), 'galleries');
  assert.equal(categoryLabel(null), 'Uncategorised');
  assert.equal(categoryLabel('  Design stores '), 'Design stores');
  assert.equal(categoryLabel('\t\r\n\f\v'), 'Uncategorised');
});

test('filters by selected categories and explicitly selects uncategorised contacts', () => {
  const rows = [
    { id: '1', category: 'Galleries' },
    { id: '2', category: null },
    { id: '3', category: '\t\r\n' },
    { id: '4', category: 'Design stores' },
  ];

  assert.deepEqual(filterByCategories(rows, []).map((row) => row.id), ['1', '2', '3', '4']);
  assert.deepEqual(filterByCategories(rows, ['Galleries', 'Uncategorised']).map((row) => row.id), ['1', '2', '3']);
});

test('filters raw contact joins with an explicit category selector', () => {
  const rows = [
    { id: '1', category_id: 'category-1', outreach_contact_categories: { id: 'category-1', name: 'Galleries' } },
    { id: '2', category_id: null, outreach_contact_categories: null },
  ];

  assert.deepEqual(
    filterByCategories(rows, ['Galleries'], (row) => row.outreach_contact_categories?.name).map((row) => row.id),
    ['1'],
  );
});

test('outreach dashboard counts distinct contact category labels, including Uncategorised', () => {
  const page = fs.readFileSync(path.resolve(__dirname, '../app/admin/outreach/page.tsx'), 'utf8');
  assert.match(page, /new Set\(contacts\.map\(\(contact\) => categoryLabel\(contact\.category\)\)\)/);
  assert.doesNotMatch(page, /String\(categories\.length\)/);
});

test('lists server categories by name and returns no categories when the query fails', async () => {
  let orderedBy;
  const categories = load('lib/outreach/categories-server.ts', {
    '@/lib/supabase-server': { createServerClient: async () => ({ from: () => ({ select: () => ({ order: async (column) => { orderedBy = column; return { data: [{ id: 'one', name: 'Galleries' }], error: null }; } }) }) }) },
  });
  assert.deepEqual(await categories.getOutreachContactCategories(), [{ id: 'one', name: 'Galleries' }]);
  assert.equal(orderedBy, 'name');

  const unavailable = load('lib/outreach/categories-server.ts', {
    '@/lib/supabase-server': { createServerClient: async () => ({ from: () => ({ select: () => ({ order: async () => ({ data: null, error: { message: 'offline' } }) }) }) }) },
  });
  assert.deepEqual(await unavailable.getOutreachContactCategories(), []);
});

function jsonRequest(url, method, body) {
  return new Request(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

test('category GET is authenticated and returns alphabetized categories', async () => {
  const route = load('app/api/admin/outreach/categories/route.ts', {
    '@/lib/outreach/auth': { requireOutreachAdmin: async () => ({ client: {} }) },
    '@/lib/outreach/categories-server': { getOutreachContactCategories: async () => [{ id: 'two', name: 'Artists' }] },
  });
  const response = await route.GET();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { categories: [{ id: 'two', name: 'Artists' }] });
});

test('category POST trims names and reuses an existing duplicate', async () => {
  let sought;
  const route = load('app/api/admin/outreach/categories/route.ts', {
    '@/lib/outreach/auth': { requireOutreachAdmin: async () => ({ client: { from: () => ({ select: () => ({ ilike: (column, value) => { sought = { column, value }; return { maybeSingle: async () => ({ data: { id: 'existing', name: 'Galleries' }, error: null }) }; } }) }) } }) },
  });
  const response = await route.POST(jsonRequest('https://example.com/categories', 'POST', { name: ' \tGalleries\n ' }));
  assert.equal(response.status, 200);
  assert.equal(sought.value, 'Galleries');
  assert.deepEqual(await response.json(), { category: { id: 'existing', name: 'Galleries' } });
});

test('category POST escapes LIKE wildcards so Art% does not match Artisan', async () => {
  let pattern;
  let inserted;
  const route = load('app/api/admin/outreach/categories/route.ts', {
    '@/lib/outreach/auth': { requireOutreachAdmin: async () => ({ client: { from: () => ({
      select: () => ({ ilike: (column, value) => { pattern = { column, value }; return { maybeSingle: async () => ({ data: null, error: null }) }; } }),
      insert: (value) => { inserted = value; return { select: () => ({ single: async () => ({ data: { id: 'art-percent', name: value.name }, error: null }) }) }; },
    }) } }) },
  });
  const response = await route.POST(jsonRequest('https://example.com/categories', 'POST', { name: 'Art%' }));
  assert.equal(response.status, 201);
  assert.deepEqual(pattern, { column: 'name', value: 'Art\\%' });
  assert.deepEqual(inserted, { name: 'Art%' });
});

test('category POST re-fetches the exact category when creation loses a unique-key race', async () => {
  let lookups = 0;
  const route = load('app/api/admin/outreach/categories/route.ts', {
    '@/lib/outreach/auth': { requireOutreachAdmin: async () => ({ client: { from: () => ({
      select: () => ({ ilike: () => ({ maybeSingle: async () => (++lookups === 1 ? { data: null, error: null } : { data: { id: 'winner', name: 'Galleries' }, error: null }) }) }),
      insert: () => ({ select: () => ({ single: async () => ({ data: null, error: { code: '23505' } }) }) }),
    }) } }) },
  });
  const response = await route.POST(jsonRequest('https://example.com/categories', 'POST', { name: 'Galleries' }));
  assert.equal(response.status, 200);
  assert.equal(lookups, 2);
  assert.deepEqual(await response.json(), { category: { id: 'winner', name: 'Galleries' } });
});

test('category POST creates a missing normalized category', async () => {
  let inserted;
  const route = load('app/api/admin/outreach/categories/route.ts', {
    '@/lib/outreach/auth': { requireOutreachAdmin: async () => ({ client: { from: () => ({ select: () => ({ ilike: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }), insert: (value) => { inserted = value; return { select: () => ({ single: async () => ({ data: { id: 'new', name: value.name }, error: null }) }) }; } }) } }) },
  });
  const response = await route.POST(jsonRequest('https://example.com/categories', 'POST', { name: ' Artists ' }));
  assert.equal(response.status, 201);
  assert.deepEqual(inserted, { name: 'Artists' });
});

test('contact category PATCH validates ids, validates selected category, and updates only category_id', async () => {
  const id = '00000000-0000-0000-0000-000000000001';
  const categoryId = '00000000-0000-0000-0000-000000000002';
  assert.equal((await load('app/api/admin/outreach/contacts/[id]/category/route.ts', { '@/lib/outreach/auth': { requireOutreachAdmin: async () => ({ client: {} }) } }).PATCH(jsonRequest('https://example.com', 'PATCH', { categoryId }), { params: Promise.resolve({ id: 'nope' }) })).status, 422);
  let updated;
  const client = {
    from: (table) => {
      if (table === 'outreach_contact_categories') return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: categoryId }, error: null }) }) }) };
      return { update: (value) => { updated = value; return { eq: () => ({ select: () => ({ maybeSingle: async () => ({ data: { id, category_id: categoryId }, error: null }) }) }) }; } };
    },
  };
  const route = load('app/api/admin/outreach/contacts/[id]/category/route.ts', {
    '@/lib/outreach/auth': { requireOutreachAdmin: async () => ({ client }) },
  });
  const response = await route.PATCH(jsonRequest('https://example.com', 'PATCH', { categoryId }), { params: Promise.resolve({ id }) });
  assert.equal(response.status, 200);
  assert.deepEqual(updated, { category_id: categoryId });
  assert.deepEqual(await response.json(), { contactId: id, categoryId });
});

test('contact category PATCH rejects unauthenticated malformed requests before validating them', async () => {
  let authorized = false;
  const route = load('app/api/admin/outreach/contacts/[id]/category/route.ts', {
    '@/lib/outreach/auth': { requireOutreachAdmin: async () => { authorized = true; throw new Error('OUTREACH_UNAUTHORIZED'); } },
  });
  const response = await route.PATCH(jsonRequest('https://example.com', 'PATCH', { categoryId: 'not-a-uuid' }), { params: Promise.resolve({ id: 'also-not-a-uuid' }) });
  assert.equal(authorized, true);
  assert.equal(response.status, 401);
});

test('contact category PATCH rejects a non-existent non-null category', async () => {
  const id = '00000000-0000-0000-0000-000000000001';
  const categoryId = '00000000-0000-0000-0000-000000000002';
  const route = load('app/api/admin/outreach/contacts/[id]/category/route.ts', {
    '@/lib/outreach/auth': { requireOutreachAdmin: async () => ({ client: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) } }) },
  });
  const response = await route.PATCH(jsonRequest('https://example.com', 'PATCH', { categoryId }), { params: Promise.resolve({ id }) });
  assert.equal(response.status, 422);
  assert.equal((await response.json()).error, 'Choose a valid contact category.');
});
