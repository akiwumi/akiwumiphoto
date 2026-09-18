import { CURRENCIES, USD_ONLY, validRate, type ExchangeRates } from './currency';

// European Central Bank reference rates, published once each working day.
const ENDPOINT = 'https://api.frankfurter.dev/v1/latest';
const REFRESH_SECONDS = 60 * 60 * 6;

/** Server-only. Falls back to US dollars alone if the rate service fails. */
export async function getExchangeRates(): Promise<ExchangeRates> {
  const symbols = CURRENCIES.map((c) => c.code).filter((c) => c !== 'USD').join(',');

  try {
    const res = await fetch(`${ENDPOINT}?base=USD&symbols=${symbols}`, {
      next: { revalidate: REFRESH_SECONDS },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { date?: string; rates?: Record<string, number> };

    const rates: ExchangeRates['rates'] = { USD: 1 };
    for (const { code } of CURRENCIES) {
      const rate = data.rates?.[code];
      if (validRate(rate)) rates[code] = rate;
    }
    return { date: data.date ?? null, rates };
  } catch (err) {
    console.error('[exchange-rates] could not load rates:', err);
    return USD_ONLY;
  }
}
