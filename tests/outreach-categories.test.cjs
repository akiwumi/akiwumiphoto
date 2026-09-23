const { test } = require('node:test');
const assert = require('node:assert/strict');
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
