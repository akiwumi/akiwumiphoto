import type { CountryCode } from './countries';

/**
 * Flat shipping, in US dollars, by the region a print is delivered to. One
 * charge per order, whatever it holds. The buyer picks their country in the
 * basket and Stripe only accepts a delivery address in that country, so the
 * rate can't be undercut by choosing a cheaper region.
 */
export const SHIPPING_USD = {
  sweden: 25,
  europe: 45,
  world: 75,
} as const;

export type ShippingRegion = keyof typeof SHIPPING_USD;

const REGION_NAMES: Record<ShippingRegion, string> = {
  sweden: 'Shipping within Sweden',
  europe: 'Shipping within Europe',
  world: 'International shipping',
};

// The EU and EEA, plus the United Kingdom and Switzerland.
const EUROPE = new Set<string>([
  'AT', 'BE', 'BG', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GR', 'HR', 'HU',
  'IE', 'IS', 'IT', 'LI', 'LT', 'LU', 'LV', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'SI', 'SK',
]);

// Countries in our list that Stripe Checkout won't collect a delivery address for.
const NO_CARD_DELIVERY = new Set<string>([
  'AS', 'CC', 'CU', 'CX', 'FM', 'HM', 'IR', 'KP', 'MH', 'MP', 'NF', 'PW', 'SY', 'UM', 'VI',
]);

export function canPayByCard(country: CountryCode): boolean {
  return !NO_CARD_DELIVERY.has(country);
}

export function shippingRegion(country: CountryCode): ShippingRegion {
  if (country === 'SE') return 'sweden';
  return EUROPE.has(country) ? 'europe' : 'world';
}

export function shippingFor(country: CountryCode): { name: string; usd: number } {
  const region = shippingRegion(country);
  return { name: REGION_NAMES[region], usd: SHIPPING_USD[region] };
}
