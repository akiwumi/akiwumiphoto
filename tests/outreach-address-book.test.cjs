const { test } = require('node:test'); const assert = require('node:assert/strict'); const { load } = require('./test-loader.cjs');
test('address book contains the 16 workbook contacts with unique primary emails', () => { const { ADDRESS_BOOK, ADDRESS_BOOK_SOURCE } = load('lib/outreach/address-book.ts'); assert.equal(ADDRESS_BOOK.length, 16); assert.equal(new Set(ADDRESS_BOOK.map((contact) => contact.email)).size, 16); assert.equal(new Set(ADDRESS_BOOK.map((contact) => contact.country)).size, 3); assert.equal(ADDRESS_BOOK.every((contact) => contact.approvedForOutreach === false && contact.suppressed === false), true); assert.equal(ADDRESS_BOOK_SOURCE, 'scandinavian_interior_designers_contacts.xlsx'); });

test('preserves imported country labels and names missing countries Unknown', () => {
  const { addressBookCountry } = load('lib/outreach/address-book.ts');
  assert.equal(addressBookCountry('Germany'), 'Germany');
  assert.equal(addressBookCountry('United Kingdom'), 'United Kingdom');
  assert.equal(addressBookCountry('  France  '), 'France');
  assert.equal(addressBookCountry(null), 'Unknown');
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
