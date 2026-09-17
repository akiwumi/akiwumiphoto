const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path');
const file = path.resolve(__dirname, '../lib/registration-receipt.ts');
const loaded = new Module(file, module);
loaded._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, file);
const { receiptFields, receiptEmail, paymentMethods } = loaded.exports;
const registration = {
  id: 'ade76746-9b85-4a50-b8c6-123456789012', created_at: '2026-09-17T12:00:00Z',
  artwork_title: '<img src=x onerror=alert(1)>', purchase_reference: '4 / 10',
  purchased_on: '2026-09-15', purchased_from: 'Gallery & Studio', payment_method: 'bank_transfer',
  message: 'Collected in person.\nThank you.', status: 'received',
  collector_snapshot: { first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com', phone: '+441234567890', address_line1: '12 Gallery Road', city: 'London', postcode: 'N1 1AA', country_code: 'GB' },
};
test('receipt preserves purchase and registration dates, contact details and payment method', () => {
  const fields = Object.fromEntries(receiptFields(registration));
  assert.equal(fields['Payment method'], 'Bank transfer');
  assert.equal(fields['Purchase date'], '2026-09-15');
  assert.match(fields['Registered'], /Stockholm/);
  assert.equal(fields['Collector'], 'Ada Lovelace');
  assert.match(fields['Address'], /12 Gallery Road/);
  assert.equal(fields['Registration reference'], registration.id.toUpperCase());
});
test('email escapes user content and contains every printable field', () => {
  const mail = receiptEmail(registration);
  assert.ok(!mail.html.includes('<img src=x'));
  assert.match(mail.html, /&lt;img/);
  assert.match(mail.html, /Gallery &amp; Studio/);
  for (const [label, value] of receiptFields(registration)) {
    assert.ok(mail.text.includes(label)); assert.ok(mail.text.includes(value));
  }
  assert.match(mail.text, /does not confirm payment/);
});
test('legacy records label missing purchase details instead of inventing them', () => {
  const fields = Object.fromEntries(receiptFields({ ...registration, purchased_on: null, purchased_from: null, payment_method: null }));
  assert.equal(fields['Purchase date'], 'Not provided');
  assert.equal(fields['Purchased from'], 'Not provided');
  assert.equal(fields['Payment method'], 'Not provided');
  assert.equal(paymentMethods.unknown, 'Unknown');
});
