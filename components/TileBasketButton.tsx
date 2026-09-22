'use client';

import { useEffect, useState } from 'react';
import { addToBasket } from '@/lib/basket-store';
import { trackAnalyticsEvent } from '@/components/AnalyticsTracker';
import type { PrintSize } from '@/types';

/**
 * One-click add from a gallery tile, in the first size still available. The
 * buyer can change size and quantity in the basket.
 */
export default function TileBasketButton({ imageId, size }: { imageId: string; size: PrintSize }) {
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 1800);
    return () => clearTimeout(timer);
  }, [added]);

  return (
    <button
      type="button"
      className="tile-basket"
      data-added={added || undefined}
      aria-label={added ? 'Added to basket' : `Add a ${size.name} print to basket`}
      onClick={(e) => {
        // The tile itself opens the lightbox.
        e.stopPropagation();
        addToBasket(imageId, size.id);
        void trackAnalyticsEvent('basket_add', { imageId, sizeId: size.id });
        setAdded(true);
      }}
    >
      {added ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 8h14l-1.1 11.1a1 1 0 0 1-1 .9H7.1a1 1 0 0 1-1-.9L5 8z" />
          <path d="M9 10V6.5a3 3 0 0 1 6 0V10" />
        </svg>
      )}
      <span className="tile-basket-label">{added ? 'Added' : 'Add to basket'}</span>
    </button>
  );
}
