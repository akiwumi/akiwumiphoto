export const UNCATEGORISED_CATEGORY = 'Uncategorised';

const ASCII_CATEGORY_WHITESPACE = /^[ \t\n\r\f\v]+|[ \t\n\r\f\v]+$/g;

export function trimCategoryName(value: string): string {
  return value.replace(ASCII_CATEGORY_WHITESPACE, '');
}

export function categoryLabel(value: unknown): string {
  const label = typeof value === 'string' ? trimCategoryName(value) : '';
  return label || UNCATEGORISED_CATEGORY;
}

export function categoryKey(value: unknown): string {
  return categoryLabel(value).toLowerCase();
}

const defaultCategoryValue = (row: unknown): unknown => (
  typeof row === 'object' && row !== null ? (row as { category?: unknown }).category : undefined
);

/**
 * Filters mapped rows by their optional `category` display projection. Pass a
 * selector when filtering raw records, such as a Supabase category join.
 */
export function filterByCategories<T>(
  rows: T[],
  selected: readonly string[],
  categoryValue: (row: T) => unknown = defaultCategoryValue,
): T[] {
  if (selected.length === 0) return rows;

  const selectedKeys = new Set(selected.map(categoryKey));
  return rows.filter((row) => selectedKeys.has(categoryKey(categoryValue(row))));
}
