const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./test-loader.cjs');

const { categoryLabel, categoryKey, filterByCategories } = load('lib/outreach/categories.ts');

test('normalizes category names and exposes Uncategorised for nulls', () => {
  assert.equal(categoryKey('  Galleries  '), 'galleries');
  assert.equal(categoryLabel(null), 'Uncategorised');
  assert.equal(categoryLabel('  Design stores '), 'Design stores');
});

test('filters by selected categories and explicitly selects uncategorised contacts', () => {
  const rows = [
    { id: '1', category: 'Galleries' },
    { id: '2', category: null },
    { id: '3', category: '   ' },
    { id: '4', category: 'Design stores' },
  ];

  assert.deepEqual(filterByCategories(rows, []).map((row) => row.id), ['1', '2', '3', '4']);
  assert.deepEqual(filterByCategories(rows, ['Galleries', 'Uncategorised']).map((row) => row.id), ['1', '2', '3']);
});
