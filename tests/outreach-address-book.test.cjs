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

test('filters campaign audience by country and keeps all recipients with no country filter', () => {
  const { campaignAudienceForCountry } = load('lib/outreach/address-book.ts');
  const recipients = [
    { id: '1', country: 'Sweden' },
    { id: '2', country: 'Germany' },
    { id: '3', country: 'Germany' },
    { id: '4', country: null },
  ];

  assert.deepEqual(campaignAudienceForCountry(recipients, 'Germany').map((recipient) => recipient.id), ['2', '3']);
  assert.deepEqual(campaignAudienceForCountry(recipients, 'Unknown').map((recipient) => recipient.id), ['4']);
  assert.deepEqual(campaignAudienceForCountry(recipients, '').map((recipient) => recipient.id), ['1', '2', '3', '4']);
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
