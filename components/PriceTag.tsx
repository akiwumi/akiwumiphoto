'use client';

import { useMoney } from '@/lib/basket-store';

/** A US dollar price shown in the buyer's chosen currency; null is POA. */
export default function PriceTag({ usd }: { usd: number | null }) {
  const { format } = useMoney();
  return <>{usd === null ? 'POA' : format(usd)}</>;
}
