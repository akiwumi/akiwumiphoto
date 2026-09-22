const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./test-loader.cjs');

test('uses a fresh campaign draft storage namespace after recipient-selection resets', () => {
  const { OUTREACH_DRAFT_STORAGE_KEY } = load('lib/outreach/draft.ts');
  assert.equal(OUTREACH_DRAFT_STORAGE_KEY, 'akiwumi-outreach-draft-v2');
});
