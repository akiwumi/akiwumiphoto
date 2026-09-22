'use client';

import { useEffect } from 'react';
import { clearBasket, forgetCheckout } from '@/lib/basket-store';

/** The basket is kept through payment and emptied once the buyer is back. */
export default function ClearBasket() {
  useEffect(() => {
    clearBasket();
    forgetCheckout();
  }, []);
  return null;
}
