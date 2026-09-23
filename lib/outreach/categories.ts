export const UNCATEGORISED_CATEGORY = 'Uncategorised';

export function categoryLabel(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : UNCATEGORISED_CATEGORY;
}

export function categoryKey(value: unknown): string {
  return categoryLabel(value).toLocaleLowerCase();
}

export function filterByCategories<T extends { category: unknown }>(rows: T[], selected: readonly string[]): T[] {
  if (selected.length === 0) return rows;

  const selectedKeys = new Set(selected.map(categoryKey));
  return rows.filter((row) => selectedKeys.has(categoryKey(row.category)));
}
