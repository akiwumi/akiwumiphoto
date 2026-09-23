const { test } = require('node:test'); const assert = require('node:assert/strict'); const XLSX = require('xlsx'); const { load } = require('./test-loader.cjs'); const { parseWorkbook, autoMapColumns } = load('lib/outreach/import.ts');
const fs = require('node:fs'); const path = require('node:path');

const DELETE_URL = 'https://example.com/api/admin/outreach/contacts/delete';
const CONTACT_ONE = '00000000-0000-0000-0000-000000000001';
const CONTACT_TWO = '00000000-0000-0000-0000-000000000002';
const CATEGORY_ONE = '00000000-0000-0000-0000-000000000010';

function deleteRequest(body) {
  return new Request(DELETE_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

function deleteRoute(client, auth = async () => ({ client, user: { id: 'admin-1' } })) {
  return load('app/api/admin/outreach/contacts/delete/route.ts', { '@/lib/outreach/auth': { requireOutreachAdmin: auth } });
}

test('guarded deletion is implemented as one admin-only database RPC without changing cascade history semantics', () => {
  const route = fs.readFileSync(path.resolve(__dirname, '../app/api/admin/outreach/contacts/delete/route.ts'), 'utf8');
  const migration = fs.readFileSync(path.resolve(__dirname, '../supabase/migrations/20260924100000_guarded_outreach_contact_deletion.sql'), 'utf8');
  assert.match(route, /\.rpc\('outreach_delete_contacts_guarded'/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /NOT EXISTS\s*\(\s*SELECT 1\s*FROM public\.outreach_deliveries/);
  assert.match(migration, /outreach_is_admin\(\)/);
  assert.match(migration, /revoke execute on function public\.outreach_delete_contacts_guarded/i);
  assert.doesNotMatch(migration, /on delete restrict/i);
});
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

test('finds a contact header after workbook title rows', () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Sweden High-End Interior Design Outreach Contacts'],
    ['Verified public contact details'], [],
    ['Business', 'Contact person', 'Email'],
    ['Svenskt Tenn', 'Tora Grape', 'tora.grape@svenskttenn.se'],
  ]));
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const result = parseWorkbook(buffer, autoMapColumns(parseWorkbook(buffer, {}).columns));
  assert.equal(result.summary.rowCount, 1);
  assert.equal(result.summary.invalidCount, 0);
  assert.equal(result.rows[0].rowNumber, 5);
  assert.equal(result.rows[0].email, 'tora.grape@svenskttenn.se');
  assert.equal(result.rows[0].company_name, 'Svenskt Tenn');
  assert.equal(result.rows[0].display_name, 'Tora Grape');
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

test('contact deletion rejects invalid, empty, and oversized selections before querying Supabase', async () => {
  let queried = false;
  const route = deleteRoute({ from: () => { queried = true; throw new Error('must not query'); } });
  for (const body of [{ contactIds: [] }, { contactIds: ['not-a-uuid'] }, { contactIds: Array.from({ length: 501 }, (_, index) => `00000000-0000-0000-0000-${String(index).padStart(12, '0')}`) }]) {
    const response = await route.POST(deleteRequest(body));
    assert.equal(response.status, 422);
  }
  assert.equal(queried, false);
});

test('contact deletion preserves delivery-backed contacts, deletes unique eligible IDs, and audits actual counts', async () => {
  let rpc; let audit;
  const client = { from: (table) => {
    if (table === 'outreach_audit_log') return { insert: async (value) => { audit = value; return { error: null }; } };
    throw new Error(`unexpected ${table}`);
  }, rpc: async (name, args) => { rpc = { name, args }; return { data: [{ deleted_contact_ids: [CONTACT_TWO], protected_contact_ids: [CONTACT_ONE], category_deleted: false }], error: null }; } };
  const route = deleteRoute(client);
  const response = await route.POST(deleteRequest({ contactIds: [` ${CONTACT_ONE} `, CONTACT_ONE, CONTACT_TWO] }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, deletedCount: 1, protectedCount: 1, protectedIds: [CONTACT_ONE], deletedIds: [CONTACT_TWO], categoryDeleted: false });
  assert.deepEqual(rpc, { name: 'outreach_delete_contacts_guarded', args: { p_contact_ids: [CONTACT_ONE, CONTACT_TWO], p_category_id: null } });
  assert.deepEqual(audit, { actor_id: 'admin-1', action: 'delete_contacts', entity_type: 'outreach_contact', entity_id: null, metadata: { requested_count: 2, deleted_count: 1, protected_count: 1, protected_ids: [CONTACT_ONE] } });
});

test('category deletion requires the exact normalized name and makes no destructive writes on mismatch', async () => {
  let writes = 0;
  const client = { from: (table) => {
    if (table !== 'outreach_contact_categories') throw new Error(`unexpected ${table}`);
    return {
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: CATEGORY_ONE, name: 'Galleries' }, error: null }) }) }),
      delete: () => { writes += 1; return { eq: async () => ({ error: null }) }; },
    };
  } };
  const route = deleteRoute(client);
  const response = await route.POST(deleteRequest({ categoryId: CATEGORY_ONE, categoryName: 'galleries' }));
  assert.equal(response.status, 422);
  assert.equal((await response.json()).error, 'Type the exact category name to delete it.');
  assert.equal(writes, 0);
});

test('category deletion keeps the category when a contact has delivery history while deleting eligible contacts', async () => {
  let categoryDeleted = false; let audit; let rpc;
  const client = { from: (table) => {
    if (table === 'outreach_contact_categories') return {
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: CATEGORY_ONE, name: 'Galleries' }, error: null }) }) }),
      delete: () => ({ eq: async () => { categoryDeleted = true; return { error: null }; } }),
    };
    if (table === 'outreach_audit_log') return { insert: async (value) => { audit = value; return { error: null }; } };
    throw new Error(`unexpected ${table}`);
  }, rpc: async (name, args) => { rpc = { name, args }; return { data: [{ deleted_contact_ids: [CONTACT_ONE], protected_contact_ids: [CONTACT_TWO], category_deleted: false, requested_count: 2 }], error: null }; } };
  const route = deleteRoute(client);
  const response = await route.POST(deleteRequest({ categoryId: CATEGORY_ONE, categoryName: ' Galleries ' }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, deletedCount: 1, protectedCount: 1, protectedIds: [CONTACT_TWO], deletedIds: [CONTACT_ONE], categoryDeleted: false });
  assert.deepEqual(rpc, { name: 'outreach_delete_contacts_guarded', args: { p_contact_ids: null, p_category_id: CATEGORY_ONE } });
  assert.equal(categoryDeleted, false);
  assert.deepEqual(audit.metadata, { requested_count: 2, deleted_count: 1, protected_count: 1, protected_ids: [CONTACT_TWO], category_id: CATEGORY_ONE, category_name: 'Galleries', category_deleted: false });
});

test('category deletion deletes all eligible contacts then its exact category and audits counts', async () => {
  let audit; let rpc;
  const client = { from: (table) => {
    if (table === 'outreach_contact_categories') return {
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: CATEGORY_ONE, name: 'Galleries' }, error: null }) }) }),
    };
    if (table === 'outreach_audit_log') return { insert: async (value) => { audit = value; return { error: null }; } };
    throw new Error(`unexpected ${table}`);
  }, rpc: async (name, args) => { rpc = { name, args }; return { data: [{ deleted_contact_ids: [CONTACT_ONE, CONTACT_TWO], protected_contact_ids: [], category_deleted: true, requested_count: 2 }], error: null }; } };
  const route = deleteRoute(client);
  const response = await route.POST(deleteRequest({ categoryId: CATEGORY_ONE, categoryName: 'Galleries' }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, deletedCount: 2, protectedCount: 0, protectedIds: [], deletedIds: [CONTACT_ONE, CONTACT_TWO], categoryDeleted: true });
  assert.deepEqual(rpc, { name: 'outreach_delete_contacts_guarded', args: { p_contact_ids: null, p_category_id: CATEGORY_ONE } });
  assert.equal(audit.action, 'delete_contact_category');
  assert.equal(audit.metadata.category_deleted, true);
});

test('contact deletion returns 403 when outreach admin authorization fails', async () => {
  const route = deleteRoute(null, async () => { throw new Error('OUTREACH_UNAUTHORIZED'); });
  assert.equal((await route.POST(deleteRequest({ contactIds: [CONTACT_ONE] }))).status, 403);
});
