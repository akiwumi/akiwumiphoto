'use client';

import { useEffect } from 'react';
import { clearBasket, forgetCheckout } from '@/lib/basket-store';
import { trackAnalyticsEvent } from '@/components/AnalyticsTracker';

/** The basket is kept through payment and emptied once the buyer is back. */
export default function ClearBasket({ reference }: { reference: string | null }) {
  useEffect(() => {
    clearBasket();
    forgetCheckout();
    if (!reference) return;
    let cancelled = false;
    fetch(`/api/print-orders/verify-paid?ref=${encodeURIComponent(reference)}`, { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (!cancelled && result?.ok) void trackAnalyticsEvent('payment_success', { category: 'prints' });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [reference]);
  return null;
}
