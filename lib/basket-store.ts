import { useSyncExternalStore } from 'react';
import { USD_ONLY, isCurrencyCode, formatMoney, type CurrencyCode, type ExchangeRates } from './currency';

/**
 * The basket and the buyer's chosen currency, kept in localStorage so they
 * survive reloads and stay in step across tabs. Read through
 * useSyncExternalStore: the server always renders an empty basket in US
 * dollars, and the browser's saved state takes over after hydration.
 *
 * A line is one photograph in one size; the same photograph in two sizes is
 * two lines.
 */
export interface BasketLine {
  imageId: string;
  sizeId: string;
  quantity: number;
}

const BASKET_KEY = 'akiwumi-basket-v1';
const CURRENCY_KEY = 'akiwumi-currency';
const MAX_LINES = 50;

const EMPTY: BasketLine[] = [];
const listeners = new Set<() => void>();

let lines: BasketLine[] | null = null;
let currency: CurrencyCode | null = null;
type RatesState = ExchangeRates & { status: 'loading' | 'ready' | 'failed' };
const RATES_LOADING: RatesState = { ...USD_ONLY, status: 'loading' };
let rates: RatesState = RATES_LOADING;
let ratesRequested = false;

function readLines(): BasketLine[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(BASKET_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed
      .filter((l): l is BasketLine =>
        typeof l?.imageId === 'string' && typeof l?.sizeId === 'string' &&
        Number.isInteger(l?.quantity) && l.quantity > 0)
      .slice(0, MAX_LINES);
  } catch {
    return EMPTY;
  }
}

function readCurrency(): CurrencyCode {
  try {
    const saved = window.localStorage.getItem(CURRENCY_KEY);
    return isCurrencyCode(saved) ? saved : 'USD';
  } catch {
    return 'USD';
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

function onStorage(event: StorageEvent) {
  if (event.key === BASKET_KEY) lines = readLines();
  else if (event.key === CURRENCY_KEY) currency = readCurrency();
  else return;
  emit();
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener('storage', onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', onStorage);
  };
}

function writeLines(next: BasketLine[]) {
  lines = next.slice(0, MAX_LINES);
  try {
    window.localStorage.setItem(BASKET_KEY, JSON.stringify(lines));
  } catch {
    // Private mode or a full quota: the basket still works for this visit.
  }
  emit();
}

function currentLines(): BasketLine[] {
  if (lines === null) lines = readLines();
  return lines;
}

// Basket ------------------------------------------------------------------------

export function useBasket(): BasketLine[] {
  return useSyncExternalStore(subscribe, currentLines, () => EMPTY);
}

export function useBasketCount(): number {
  return useBasket().reduce((sum, line) => sum + line.quantity, 0);
}

/** Adds one print, merging with a line already holding that photo and size. */
export function addToBasket(imageId: string, sizeId: string, quantity = 1) {
  const existing = currentLines();
  const match = existing.find((l) => l.imageId === imageId && l.sizeId === sizeId);
  writeLines(match
    ? existing.map((l) => (l === match ? { ...l, quantity: l.quantity + quantity } : l))
    : [...existing, { imageId, sizeId, quantity }]);
}

export function setLineQuantity(imageId: string, sizeId: string, quantity: number) {
  writeLines(currentLines().map((l) =>
    l.imageId === imageId && l.sizeId === sizeId ? { ...l, quantity: Math.max(1, Math.floor(quantity)) } : l));
}

/** Moves a line to another size, folding it into that size's line if present. */
export function changeLineSize(imageId: string, fromSizeId: string, toSizeId: string) {
  if (fromSizeId === toSizeId) return;
  const existing = currentLines();
  const moving = existing.find((l) => l.imageId === imageId && l.sizeId === fromSizeId);
  if (!moving) return;
  const target = existing.find((l) => l.imageId === imageId && l.sizeId === toSizeId);
  writeLines(existing
    .filter((l) => l !== moving)
    .map((l) => (l === target ? { ...l, quantity: l.quantity + moving.quantity } : l))
    .concat(target ? [] : [{ ...moving, sizeId: toSizeId }]));
}

export function removeLine(imageId: string, sizeId: string) {
  writeLines(currentLines().filter((l) => !(l.imageId === imageId && l.sizeId === sizeId)));
}

export function clearBasket() {
  writeLines(EMPTY);
}

// Checkout ------------------------------------------------------------------------
// The Stripe session the buyer was last sent to. Released when they come back
// to the basket without paying, so their own hold doesn't block a retry.

const CHECKOUT_KEY = 'akiwumi-checkout-session';

export function rememberCheckout(sessionId: string) {
  try {
    window.sessionStorage.setItem(CHECKOUT_KEY, sessionId);
  } catch {
    // Without it the hold simply lapses after 30 minutes.
  }
}

export function forgetCheckout() {
  try {
    window.sessionStorage.removeItem(CHECKOUT_KEY);
  } catch {
    // Nothing to forget.
  }
}

export async function releaseAbandonedCheckout(): Promise<void> {
  let sessionId: string | null = null;
  try {
    sessionId = window.sessionStorage.getItem(CHECKOUT_KEY);
  } catch {
    return;
  }
  if (!sessionId) return;
  forgetCheckout();
  await fetch('/api/print-orders/release', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  }).catch(() => {});
}

// Currency ------------------------------------------------------------------------

function currentCurrency(): CurrencyCode {
  if (currency === null) currency = readCurrency();
  return currency;
}

export function setCurrency(next: CurrencyCode) {
  currency = next;
  try {
    window.localStorage.setItem(CURRENCY_KEY, next);
  } catch {
    // As above: kept for this visit only.
  }
  emit();
}

function currentRates(): RatesState {
  if (!ratesRequested) {
    ratesRequested = true;
    fetch('/api/exchange-rates')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ExchangeRates | null) => {
        rates = data?.rates && Object.keys(data.rates).length > 1
          ? { ...data, status: 'ready' }
          : { ...USD_ONLY, status: 'failed' };
        emit();
      })
      .catch(() => {
        rates = { ...USD_ONLY, status: 'failed' };
        emit();
      });
  }
  return rates;
}

export interface Money {
  /** The chosen currency, or USD while its rate is unavailable. */
  currency: CurrencyCode;
  rate: number;
  ratesDate: string | null;
  ratesStatus: RatesState['status'];
  format: (usd: number) => string;
}

/** Converts US dollar prices into the buyer's chosen currency for display. */
export function useMoney(): Money {
  const chosen = useSyncExternalStore(subscribe, currentCurrency, () => 'USD' as CurrencyCode);
  const loaded = useSyncExternalStore(subscribe, currentRates, () => RATES_LOADING);
  const rate = loaded.rates[chosen];
  const active: CurrencyCode = rate ? chosen : 'USD';
  const activeRate = rate ?? 1;
  return {
    currency: active,
    rate: activeRate,
    ratesDate: loaded.date,
    ratesStatus: loaded.status,
    format: (usd: number) => formatMoney(usd * activeRate, active),
  };
}

/** The currency the buyer picked, even while its rate is still loading. */
export function useChosenCurrency(): CurrencyCode {
  return useSyncExternalStore(subscribe, currentCurrency, () => 'USD' as CurrencyCode);
}
