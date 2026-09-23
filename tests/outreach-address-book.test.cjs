const { test } = require('node:test'); const assert = require('node:assert/strict'); const { load } = require('./test-loader.cjs');
test('address book contains the 16 workbook contacts with unique primary emails', () => { const { ADDRESS_BOOK, ADDRESS_BOOK_SOURCE } = load('lib/outreach/address-book.ts'); assert.equal(ADDRESS_BOOK.length, 16); assert.equal(new Set(ADDRESS_BOOK.map((contact) => contact.email)).size, 16); assert.equal(new Set(ADDRESS_BOOK.map((contact) => contact.country)).size, 3); assert.equal(ADDRESS_BOOK.every((contact) => contact.approvedForOutreach === false && contact.suppressed === false), true); assert.equal(ADDRESS_BOOK_SOURCE, 'scandinavian_interior_designers_contacts.xlsx'); });

test('preserves imported country labels and names missing countries Unknown', () => {
  const { addressBookCountry } = load('lib/outreach/address-book.ts');
  assert.equal(addressBookCountry('Germany'), 'Germany');
  assert.equal(addressBookCountry('United Kingdom'), 'United Kingdom');
  assert.equal(addressBookCountry('  France  '), 'France');
  assert.equal(addressBookCountry(null), 'Unknown');
  assert.equal(addressBookCountry(42), 'Unknown');
  assert.equal(addressBookCountry('   '), 'Unknown');
});

test('filters address-book contacts by country together with text search', () => {
  const { filterAddressBookContacts } = load('lib/outreach/address-book.ts');
  const contacts = [
    { id: '1', name: 'Ava', studio: 'North Studio', email: 'ava@example.com', country: 'Sweden' },
    { id: '2', name: 'Bea', studio: 'Berlin Rooms', email: 'bea@example.com', country: 'Germany' },
    { id: '3', name: 'Cam', studio: 'North Studio', email: 'cam@example.com', country: 'Germany' },
  ];
  assert.deepEqual(filterAddressBookContacts(contacts, '', 'Germany').map((contact) => contact.id), ['2', '3']);
  assert.deepEqual(filterAddressBookContacts(contacts, 'north', 'Germany').map((contact) => contact.id), ['3']);
  assert.deepEqual(filterAddressBookContacts(contacts, 'ava', '').map((contact) => contact.id), ['1']);
});

test('filters address-book contacts by category as well as country and normalized search', () => {
  const { filterAddressBookContacts } = load('lib/outreach/address-book.ts');
  const contacts = [
    { id: '1', name: 'Ava', studio: 'North Studio', email: 'ava@example.com', country: 'Sweden', category: 'Galleries' },
    { id: '2', name: 'Bea', studio: 'North Studio', email: 'bea@example.com', country: 'Germany', category: 'Design stores' },
    { id: '3', name: 'Cam', studio: 'Berlin Rooms', email: 'cam@example.com', country: 'Germany', category: null },
  ];
  assert.deepEqual(filterAddressBookContacts(contacts, 'design stores', '', '').map((contact) => contact.id), ['2']);
  assert.deepEqual(filterAddressBookContacts(contacts, 'north', 'Germany', 'Design stores').map((contact) => contact.id), ['2']);
  assert.deepEqual(filterAddressBookContacts(contacts, '', 'Germany', 'Uncategorised').map((contact) => contact.id), ['3']);
});

test('filters campaign audience by multiple countries and keeps all recipients with no country filters', () => {
  const { campaignAudienceForCountries } = load('lib/outreach/address-book.ts');
  const recipients = [
    { id: '1', country: 'Sweden' },
    { id: '2', country: 'Germany' },
    { id: '3', country: 'Germany' },
    { id: '4', country: null },
  ];

  assert.deepEqual(campaignAudienceForCountries(recipients, ['Germany', 'Sweden']).map((recipient) => recipient.id), ['1', '2', '3']);
  assert.deepEqual(campaignAudienceForCountries(recipients, ['Unknown']).map((recipient) => recipient.id), ['4']);
  assert.deepEqual(campaignAudienceForCountries(recipients, []).map((recipient) => recipient.id), ['1', '2', '3', '4']);
});

test('intersects country and category campaign filters while preserving no-filter recipients', () => {
  const { campaignAudienceForCountries } = load('lib/outreach/address-book.ts');
  const recipients = [
    { id: '1', country: 'Sweden', category: 'Galleries' },
    { id: '2', country: 'Germany', category: 'Galleries' },
    { id: '3', country: 'Germany', category: 'Design stores' },
    { id: '4', country: 'Germany', category: null },
  ];
  assert.deepEqual(campaignAudienceForCountries(recipients, ['Germany'], ['Galleries']).map((recipient) => recipient.id), ['2']);
  assert.deepEqual(campaignAudienceForCountries(recipients, [], ['Uncategorised']).map((recipient) => recipient.id), ['4']);
  assert.deepEqual(campaignAudienceForCountries(recipients, [], []).map((recipient) => recipient.id), ['1', '2', '3', '4']);
});

test('campaign audience category selection intersects country filters', () => {
  const { campaignAudienceForCountries } = load('lib/outreach/address-book.ts');
  const recipients = [
    { id: '1', country: 'Sweden', category: 'Galleries' },
    { id: '2', country: 'Germany', category: 'Galleries' },
    { id: '3', country: 'Germany', category: 'Design stores' },
    { id: '4', country: 'Germany', category: null },
  ];
  assert.deepEqual(campaignAudienceForCountries(recipients, ['Germany'], ['Galleries', 'Uncategorised']).map((recipient) => recipient.id), ['2', '4']);
});

test('campaign page passes managed categories to the audience selector', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const page = fs.readFileSync(path.resolve(__dirname, '../app/admin/outreach/campaigns/new/page.tsx'), 'utf8');
  assert.match(page, /getOutreachContactCategories/);
  assert.match(page, /categories=\{categories\}/);
});

test('maps a category join safely when the relation is returned as an array or missing', async () => {
  const { getAddressBook } = load('lib/outreach/address-book-server.ts', {
    '@/lib/supabase-server': { createServerClient: async () => ({ from: () => ({ select: () => ({ order: async () => ({ error: null, data: [
      { id: 'one', email: 'one@example.com', first_name: 'One', last_name: null, company_name: null, country: 'Sweden', website: null, source: null, approved_for_outreach: true, contact_status: 'approved', suppressed_at: null, notes: null, category_id: 'cat-1', outreach_contact_categories: [{ id: 'cat-1', name: 'Galleries' }] },
      { id: 'two', email: 'two@example.com', first_name: 'Two', last_name: null, company_name: null, country: null, website: null, source: null, approved_for_outreach: false, contact_status: 'imported', suppressed_at: null, notes: null, category_id: null, outreach_contact_categories: null },
    ] }) }) }) }) },
  });
  const contacts = await getAddressBook();
  assert.deepEqual(contacts.map((contact) => [contact.categoryId, contact.category]), [['cat-1', 'Galleries'], [null, null]]);
});

test('campaign audience visible bulk selection only changes the current country view', () => {
  const { campaignAudienceSelectionForVisible } = load('lib/outreach/address-book.ts');
  const sweden = [{ id: 'se-01' }, { id: 'se-02' }];
  const germany = [{ id: 'de-01' }, { id: 'de-02' }];

  let selected = campaignAudienceSelectionForVisible([], sweden, false);
  assert.deepEqual(selected, ['se-01', 'se-02']);

  selected = campaignAudienceSelectionForVisible(selected, germany, false);
  assert.deepEqual(selected, ['se-01', 'se-02', 'de-01', 'de-02']);

  selected = campaignAudienceSelectionForVisible(selected, germany, true);
  assert.deepEqual(selected, ['se-01', 'se-02']);
});
