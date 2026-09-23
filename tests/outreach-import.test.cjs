const { test } = require('node:test'); const assert = require('node:assert/strict'); const XLSX = require('xlsx'); const { load } = require('./test-loader.cjs'); const { parseWorkbook } = load('lib/outreach/import.ts');
test('parses, normalizes, and flags duplicate workbook rows', () => { const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Email','First'],[' ANA@example.com ','Ana'],['ana@example.com','Ana 2'],['bad','No']])); const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }); const result = parseWorkbook(buffer, { Email: 'email', First: 'first_name' }); assert.equal(result.summary.rowCount, 3); assert.equal(result.summary.duplicateCount, 1); assert.equal(result.rows[0].email, 'ana@example.com'); assert.equal(result.rows[2].valid, false); });

test('parses CSV after title rows and flags only malformed or missing email rows', () => {
  const csv = [
    'Akiwumi Photo address book',
    'Exported 2026-09-23',
    'Contact Name,City,Public Professional Email',
    'Ana,Accra,ana@example.com',
    'Bea,Kumasi,not-an-email',
    'Cy,Tema,',
  ].join('\n');
  const result = parseWorkbook(Buffer.from(csv), {
    'Contact Name': 'display_name',
    City: 'city',
    'Public Professional Email': 'email',
  });
  assert.deepEqual(result.columns, ['Contact Name', 'City', 'Public Professional Email']);
  assert.equal(result.summary.rowCount, 3);
  assert.equal(result.summary.validCount, 1);
  assert.equal(result.summary.invalidCount, 2);
  assert.equal(result.rows[0].rowNumber, 4);
  assert.equal(result.rows[0].valid, true);
  assert.equal(result.rows[1].valid, false);
  assert.equal(result.rows[2].valid, false);
});

test('keeps row zero as the header when a manual mapping uses unknown column names', () => {
  const result = parseWorkbook(Buffer.from('Primary Contact\nana@example.com\n'), { 'Primary Contact': 'email' });
  assert.deepEqual(result.columns, ['Primary Contact']);
  assert.equal(result.rows[0].email, 'ana@example.com');
  assert.equal(result.rows[0].rowNumber, 2);
});

test('skips a two-cell metadata row before a standard email header', () => {
  const csv = [
    'Title,Exported',
    'Akiwumi Photo contacts,2026-09-23',
    'Contact Name,Public Professional Email',
    'Ana,ana@example.com',
  ].join('\n');
  const result = parseWorkbook(Buffer.from(csv), {
    'Contact Name': 'display_name',
    'Public Professional Email': 'email',
  });
  assert.deepEqual(result.columns, ['Contact Name', 'Public Professional Email']);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].rowNumber, 4);
  assert.equal(result.rows[0].email, 'ana@example.com');
});

test('skips a single-cell Title row before a later manually mapped table header', () => {
  const csv = [
    'Title',
    'Akiwumi Photo contacts',
    'Custom Name,Public Professional Email',
    'Ana,ana@example.com',
  ].join('\n');
  const result = parseWorkbook(Buffer.from(csv), {
    'Custom Name': 'display_name',
    'Public Professional Email': 'email',
  });
  assert.deepEqual(result.columns, ['Custom Name', 'Public Professional Email']);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].rowNumber, 4);
  assert.equal(result.rows[0].email, 'ana@example.com');
});

test('parses XLSX title rows before the detected address-book header', () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Akiwumi Photo address book'],
    ['Exported 2026-09-23'],
    ['Contact Name', 'Public Professional Email'],
    ['Ana', 'ana@example.com'],
  ]));
  const result = parseWorkbook(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }), {
    'Contact Name': 'display_name',
    'Public Professional Email': 'email',
  });
  assert.deepEqual(result.columns, ['Contact Name', 'Public Professional Email']);
  assert.equal(result.rows[0].rowNumber, 4);
  assert.equal(result.rows[0].email, 'ana@example.com');
});

function importRequest(fields = {}) {
  const form = new FormData();
  form.set('file', new File([new Uint8Array([1])], 'contacts.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  Object.entries(fields).forEach(([key, value]) => form.set(key, value));
  return new Request('https://example.com/api/admin/outreach/import', { method: 'POST', body: form });
}

const parsed = { columns: ['Email'], rows: [{ email: 'ana@example.com', valid: true }, { email: 'bea@example.com', valid: true }], summary: { rowCount: 2, duplicateCount: 0, invalidCount: 0 } };

test('import commit requires a category but preview does not', async () => {
  const route = load('app/api/admin/outreach/import/route.ts', {
    '@/lib/outreach/auth': { requireOutreachAdmin: async () => ({ client: {} }) },
    '@/lib/outreach/import': { parseWorkbook: () => parsed, autoMapColumns: () => ({ Email: 'email' }) },
  });
  const commit = await route.POST(importRequest({ commit: '1' }));
  assert.equal(commit.status, 422);
  assert.equal((await commit.json()).error, 'Choose a contact category before importing.');
  assert.equal((await route.POST(importRequest())).status, 200);
});

test('import commit rejects an unknown category and attaches a valid category to contacts and audit metadata', async () => {
  const categoryId = '00000000-0000-0000-0000-000000000001';
  let contacts; let audit;
  const client = { from: (table) => ({
    select: () => table === 'outreach_contact_categories' ? ({ eq: () => ({ maybeSingle: async () => ({ data: { id: categoryId, name: 'Galleries' }, error: null }) }) }) : ({ in: async () => ({ data: [], error: null }) }),
    insert: (value) => table === 'outreach_import_batches' ? ({ select: () => ({ single: async () => ({ data: { id: 'batch-1' }, error: null }) }) }) : (audit = value, Promise.resolve({ error: null })),
    upsert: (value) => { contacts = value; return Promise.resolve({ error: null }); },
    update: () => ({ eq: async () => ({ error: null }) }),
  }) };
  const route = load('app/api/admin/outreach/import/route.ts', {
    '@/lib/outreach/auth': { requireOutreachAdmin: async () => ({ client, user: { id: 'admin' } }) },
    '@/lib/outreach/import': { parseWorkbook: () => parsed, autoMapColumns: () => ({ Email: 'email' }) },
  });
  const response = await route.POST(importRequest({ commit: '1', categoryId }));
  assert.equal(response.status, 200);
  assert.equal(contacts.length, 2);
  assert.ok(contacts.every((contact) => contact.category_id === categoryId));
  assert.deepEqual(audit.metadata.category_id, categoryId);
  assert.deepEqual(audit.metadata.category_name, 'Galleries');
});

test('import commit rejects an unknown category id before any import write', async () => {
  const categoryId = '00000000-0000-0000-0000-000000000001';
  let writes = 0;
  const client = {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      insert: () => { writes += 1; },
    }),
  };
  const route = load('app/api/admin/outreach/import/route.ts', {
    '@/lib/outreach/auth': { requireOutreachAdmin: async () => ({ client }) },
    '@/lib/outreach/import': { parseWorkbook: () => parsed, autoMapColumns: () => ({ Email: 'email' }) },
  });
  const response = await route.POST(importRequest({ commit: '1', categoryId }));
  assert.equal(response.status, 422);
  assert.equal((await response.json()).error, 'Choose a valid contact category before importing.');
  assert.equal(writes, 0);
});

test('import commit rejects a malformed category id before querying Supabase', async () => {
  let queried = false;
  const route = load('app/api/admin/outreach/import/route.ts', {
    '@/lib/outreach/auth': { requireOutreachAdmin: async () => ({ client: { from: () => { queried = true; throw new Error('should not query'); } } }) },
    '@/lib/outreach/import': { parseWorkbook: () => parsed, autoMapColumns: () => ({ Email: 'email' }) },
  });
  const response = await route.POST(importRequest({ commit: '1', categoryId: 'not-a-uuid' }));
  assert.equal(response.status, 422);
  assert.equal((await response.json()).error, 'Choose a valid contact category before importing.');
  assert.equal(queried, false);
});

test('import commit returns a server error when category lookup fails', async () => {
  const categoryId = '00000000-0000-0000-0000-000000000001';
  const route = load('app/api/admin/outreach/import/route.ts', {
    '@/lib/outreach/auth': { requireOutreachAdmin: async () => ({ client: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: 'database unavailable' } }) }) }) }) } }) },
    '@/lib/outreach/import': { parseWorkbook: () => parsed, autoMapColumns: () => ({ Email: 'email' }) },
  });
  const response = await route.POST(importRequest({ commit: '1', categoryId }));
  assert.equal(response.status, 500);
  assert.equal((await response.json()).error, 'Could not validate contact category.');
});

test('import commit skips invalid rows and reports their source row issues', async () => {
  const categoryId = '00000000-0000-0000-0000-000000000001';
  const mixedParsed = {
    columns: ['Email'],
    rows: [
      { email: 'ana@example.com', valid: true, rowNumber: 2 },
      { email: null, valid: false, rowNumber: 3, issues: ['Email is invalid or missing'] },
    ],
    summary: { rowCount: 2, validCount: 1, duplicateCount: 0, invalidCount: 1 },
  };
  let contacts; let batch;
  const client = { from: (table) => ({
    select: () => table === 'outreach_contact_categories'
      ? ({ eq: () => ({ maybeSingle: async () => ({ data: { id: categoryId, name: 'Galleries' }, error: null }) }) })
      : ({ in: async () => ({ data: [], error: null }) }),
    insert: (value) => table === 'outreach_import_batches'
      ? (batch = value, { select: () => ({ single: async () => ({ data: { id: 'batch-1' }, error: null }) }) })
      : Promise.resolve({ error: null }),
    upsert: (value) => { contacts = value; return Promise.resolve({ error: null }); },
    update: () => ({ eq: async () => ({ error: null }) }),
  }) };
  const route = load('app/api/admin/outreach/import/route.ts', {
    '@/lib/outreach/auth': { requireOutreachAdmin: async () => ({ client, user: { id: 'admin' } }) },
    '@/lib/outreach/import': { parseWorkbook: () => mixedParsed, autoMapColumns: () => ({ Email: 'email' }) },
  });
  const response = await route.POST(importRequest({ commit: '1', categoryId }));
  assert.equal(response.status, 200);
  assert.deepEqual(contacts.map((contact) => contact.email), ['ana@example.com']);
  assert.deepEqual({ rowCount: batch.row_count, invalidCount: batch.invalid_count }, { rowCount: 2, invalidCount: 1 });
  assert.deepEqual(await response.json(), {
    ok: true,
    importedCount: 1,
    duplicateCount: 0,
    skippedCount: 1,
    skippedRows: [{ rowNumber: 3, issues: ['Email is invalid or missing'] }],
    batchId: 'batch-1',
    message: '1 contacts imported into Supabase and approved for outreach.',
  });
});

test('import commit rejects a workbook with no valid email rows before writes', async () => {
  const categoryId = '00000000-0000-0000-0000-000000000001';
  const invalidParsed = {
    columns: ['Email'],
    rows: [{ email: null, valid: false, rowNumber: 3, issues: ['Email is invalid or missing'] }],
    summary: { rowCount: 1, validCount: 0, duplicateCount: 0, invalidCount: 1 },
  };
  let writes = 0;
  const client = { from: (table) => ({
    select: () => table === 'outreach_contact_categories'
      ? ({ eq: () => ({ maybeSingle: async () => ({ data: { id: categoryId, name: 'Galleries' }, error: null }) }) })
      : ({ in: async () => ({ data: [], error: null }) }),
    insert: () => { writes += 1; return Promise.resolve({ error: null }); },
    upsert: () => { writes += 1; return Promise.resolve({ error: null }); },
  }) };
  const route = load('app/api/admin/outreach/import/route.ts', {
    '@/lib/outreach/auth': { requireOutreachAdmin: async () => ({ client }) },
    '@/lib/outreach/import': { parseWorkbook: () => invalidParsed, autoMapColumns: () => ({ Email: 'email' }) },
  });
  const response = await route.POST(importRequest({ commit: '1', categoryId }));
  assert.equal(response.status, 422);
  assert.equal((await response.json()).error, 'No valid email rows found to import.');
  assert.equal(writes, 0);
});
