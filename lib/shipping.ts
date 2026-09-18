import type { CountryCode } from './countries';
import { fromMinorUnits, toMinorUnits, validRate, type CurrencyCode, type ExchangeRates } from './currency';
import { regionForCountry } from './regions';

export const SHIPPING_POLICY = 'Post and packaging per order: free within Sweden, €25 within the EU outside Sweden, £30 to the UK, and US$45 to the rest of the world.';
export const DISPATCH_NOTICE = 'Prints will be shipped within 7 working days of your order being placed.';

const SHIPPING = {
  sweden: { name: 'Shipping within Sweden', amount: 0, currency: 'SEK' },
  uk: { name: 'Shipping to the United Kingdom', amount: 30, currency: 'GBP' },
  eu: { name: 'Shipping within the EU', amount: 25, currency: 'EUR' },
  world: { name: 'International shipping', amount: 45, currency: 'USD' },
} as const;

const NO_CARD_DELIVERY = new Set<string>([
  'AS', 'CC', 'CU', 'CX', 'FM', 'HM', 'IR', 'KP', 'MH', 'MP', 'NF', 'PW', 'SY', 'UM', 'VI',
]);

export function canPayByCard(country: CountryCode): boolean {
  return !NO_CARD_DELIVERY.has(country);
}

export function shippingFor(country: CountryCode) {
  return SHIPPING[regionForCountry(country)];
}

/** One fee per order, based solely on delivery country. Rates are units per USD. */
export function shippingQuote(country: CountryCode, currency: CurrencyCode, exchange: ExchangeRates) {
  const shipping = shippingFor(country);
  if (shipping.amount === 0) return { ...shipping, minorAmount: 0, usd: 0 };
  const nativeRate = exchange.rates[shipping.currency];
  const targetRate = exchange.rates[currency];
  if (!validRate(nativeRate) || !validRate(targetRate)) return null;
  const minorAmount = toMinorUnits(shipping.currency === currency
    ? shipping.amount : shipping.amount / nativeRate * targetRate, currency);
  return { ...shipping, minorAmount, usd: fromMinorUnits(minorAmount, currency) / targetRate };
}

interface ShippingSession {
  currency: string | null;
  shipping_cost?: { amount_total: number } | null;
  metadata?: Record<string, string> | null;
  collected_information?: { shipping_details?: { address: { country: string | null } } | null } | null;
}

/** New sessions carry a server-created USD snapshot; old sessions were priced in USD. */
export function shippingUsdForSession(session: ShippingSession): number | null {
  const meta = session.metadata;
  if (meta?.shipping_quote_version === '1') {
    const usd = Number(meta.shipping_usd);
    if (!meta.shipping_usd || !Number.isFinite(usd) || usd < 0 ||
        session.currency?.toUpperCase() !== meta.shipping_currency ||
        session.shipping_cost?.amount_total !== Number(meta.shipping_minor) ||
        session.collected_information?.shipping_details?.address.country !== meta.shipping_country) {
      throw new Error('Checkout shipping does not match the server quote');
    }
    return usd;
  }
  return session.shipping_cost ? session.shipping_cost.amount_total / 100 : null;
}
