'use client';

import { useState } from 'react';
import Link from 'next/link';
import { addToBasket, useBasketCount, useMoney } from '@/lib/basket-store';
import { editionLabel, isPurchasable, remaining } from '@/lib/print-availability';
import type { PrintSize, SoldBySize } from '@/types';

interface Props {
  imageId: string;
  sizes: PrintSize[];
  sold: SoldBySize | undefined;
  onClose: () => void;
}

/** Size choice for one photograph: price, edition progress, add to basket. */
export default function BuyPrintPanel({ imageId, sizes, sold, onClose }: Props) {
  const { format } = useMoney();
  const basketCount = useBasketCount();
  // Keyed by image and size so moving to the next photograph resets it.
  const [added, setAdded] = useState<string | null>(null);

  return (
    <div className="buy-panel" role="region" aria-label="Buy a print">
      <div className="buy-panel-header">
        <p>Choose a size</p>
        <button type="button" onClick={onClose} className="buy-panel-close" aria-label="Close size options">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <ul className="buy-panel-sizes">
        {sizes.map((size) => {
          const purchasable = isPurchasable(size, sold);
          const key = `${imageId}:${size.id}`;
          return (
            <li key={size.id}>
              <div>
                <p className="buy-panel-size">
                  {size.name}{size.dimensions && <span> · {size.dimensions}</span>}
                </p>
                <p className="buy-panel-meta">
                  {size.price_usd === null ? 'Price on application' : format(size.price_usd)} · {editionLabel(size, sold)}
                </p>
              </div>
              {purchasable ? (
                <button
                  type="button"
                  className="buy-panel-add"
                  onClick={() => {
                    addToBasket(imageId, size.id);
                    setAdded(key);
                  }}
                  aria-label={`Add ${size.name} print to basket`}
                >
                  {added === key ? 'Added ✓' : 'Add'}
                </button>
              ) : (
                <span className="buy-panel-unavailable">
                  {size.price_usd === null ? 'POA' : remaining(size, sold) === 0 ? 'Sold out' : ''}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {basketCount > 0 && (
        <Link href="/basket" className="buy-panel-basket">
          View basket ({basketCount}) <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}
