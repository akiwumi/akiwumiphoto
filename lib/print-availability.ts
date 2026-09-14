import type { PrintSize, SoldBySize } from '@/types';

/** Shared by the gallery, the lightbox and the basket. Safe on either side. */
export function remaining(size: PrintSize, sold: SoldBySize | undefined): number {
  return Math.max(size.edition_size - (sold?.[size.id] ?? 0), 0);
}

/** A size can go in the basket if it is priced and not sold out. */
export function isPurchasable(size: PrintSize, sold: SoldBySize | undefined): boolean {
  return size.price_usd !== null && remaining(size, sold) > 0;
}

/** The size a one-click "add to basket" picks: the first one still available. */
export function defaultSize(sizes: PrintSize[], sold: SoldBySize | undefined): PrintSize | undefined {
  return sizes.find((size) => isPurchasable(size, sold));
}

/** "3 of 10 sold", or for a one-off, "Unique, available" / "Unique, sold". */
export function editionLabel(size: PrintSize, sold: SoldBySize | undefined): string {
  const count = sold?.[size.id] ?? 0;
  if (size.edition_size === 1) return count >= 1 ? 'Unique, sold' : 'Unique, available';
  return `${Math.min(count, size.edition_size)} of ${size.edition_size} sold`;
}
