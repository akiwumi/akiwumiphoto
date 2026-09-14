'use client';

import { useId } from 'react';
import { CURRENCIES, isCurrencyCode } from '@/lib/currency';
import { setCurrency, useChosenCurrency, useMoney } from '@/lib/basket-store';

export default function CurrencySelect() {
  const id = useId();
  const chosen = useChosenCurrency();
  const { currency, ratesDate, ratesStatus } = useMoney();

  return (
    <div className="currency-select">
      <label htmlFor={id}>Currency</label>
      <select
        id={id}
        value={chosen}
        onChange={(e) => { if (isCurrencyCode(e.target.value)) setCurrency(e.target.value); }}
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>{c.code} · {c.name}</option>
        ))}
      </select>
      {chosen !== 'USD' && ratesStatus !== 'loading' && (
        <p className="currency-note">
          {currency === chosen
            ? `Converted from US dollars at the ECB rate${ratesDate ? ` of ${ratesDate}` : ''}. Approximate; your invoice confirms the amount.`
            : 'Exchange rates are unavailable right now, so prices are shown in US dollars.'}
        </p>
      )}
    </div>
  );
}
