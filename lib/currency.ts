/**
 * Prices are set and recorded in US dollars. Buyers may view them in another
 * currency, converted at the European Central Bank reference rate.
 * Checkout charges the selected currency using the server's current rate.
 */
export const BASE_CURRENCY = 'USD';

export const CURRENCIES = [
  { code: 'USD', name: 'US dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British pound' },
  { code: 'SEK', name: 'Swedish krona' },
  { code: 'NOK', name: 'Norwegian krone' },
  { code: 'DKK', name: 'Danish krone' },
  { code: 'CHF', name: 'Swiss franc' },
  { code: 'CAD', name: 'Canadian dollar' },
  { code: 'AUD', name: 'Australian dollar' },
  { code: 'JPY', name: 'Japanese yen' },
  { code: 'ZAR', name: 'South African rand' },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]['code'];

const CODES = new Set<string>(CURRENCIES.map((c) => c.code));

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && CODES.has(value);
}

/** Units of each currency per US dollar. USD is always present. */
export interface ExchangeRates {
  date: string | null;
  rates: Partial<Record<CurrencyCode, number>>;
}

export const USD_ONLY: ExchangeRates = { date: null, rates: { USD: 1 } };

export function validRate(rate: unknown): rate is number {
  return typeof rate === 'number' && Number.isFinite(rate) && rate > 0;
}

export function toMinorUnits(amount: number, currency: CurrencyCode): number {
  return Math.round(amount * (currency === 'JPY' ? 1 : 100));
}

export function fromMinorUnits(amount: number, currency: CurrencyCode): number {
  return amount / (currency === 'JPY' ? 1 : 100);
}

export function formatMinorUnits(amount: number, currency: CurrencyCode): string {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(fromMinorUnits(amount, currency));
}

/**
 * Whole units: prices are whole dollars, and a converted amount shown to the
 * cent would suggest a precision the rate does not have.
 */
export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
