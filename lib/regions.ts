import type { CurrencyCode } from './currency';

// EU members and outermost regions with separate ISO codes.
const EU = new Set([
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR',
  'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
  'AX', 'GF', 'GP', 'MQ', 'RE', 'YT', 'MF',
]);

export function regionForCountry(country: string | null | undefined) {
  const code = country?.trim().toUpperCase();
  if (code === 'SE') return 'sweden';
  if (code === 'GB') return 'uk';
  return code && EU.has(code) ? 'eu' : 'world';
}

export function currencyForCountry(country: string | null | undefined): CurrencyCode {
  return { sweden: 'SEK', uk: 'GBP', eu: 'EUR', world: 'USD' }[regionForCountry(country)] as CurrencyCode;
}
