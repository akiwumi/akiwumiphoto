const { test } = require('node:test'); const assert = require('node:assert/strict'); const { load } = require('./test-loader.cjs'); const { renderMessage, imageWarnings, greeting } = load('lib/outreach/render.ts');
test('renders allowlisted fields and escapes HTML', () => { const result = renderMessage({ html: '<p>Hello {{first_name}} {{company_name}}</p>', subject: 'Hi {{first_name}}', data: { first_name: '<Ana>', company_name: 'Studio' } }); assert.match(result.html, /&lt;Ana&gt;/); assert.equal(result.subject, 'Hi <Ana>'); });
test('renders missing first name greeting safely', () => assert.equal(greeting(null), 'Hello,'));
test('renders unsupported merge tags as blank', () => assert.equal(renderMessage({ html: '{{unknown}}', subject: 'x', data: {} }).html, ''));
test('warns on local and signed image urls', () => assert.equal(imageWarnings('<img src="/local.jpg"><img src="https://x.test/a.jpg?token=1">').length, 2));
