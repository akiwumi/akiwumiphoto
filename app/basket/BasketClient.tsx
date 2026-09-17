'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import CurrencySelect from '@/components/CurrencySelect';
import {
  changeLineSize, releaseAbandonedCheckout, rememberCheckout, removeLine, setLineQuantity, useBasket, useMoney,
  type BasketLine,
} from '@/lib/basket-store';
import { countryOptions } from '@/lib/countries';
import { formatMoney } from '@/lib/currency';
import { SHIPPING_USD } from '@/lib/shipping';
import { editionLabel, isPurchasable, remaining } from '@/lib/print-availability';
import type { CatalogImage, PrintSize, SoldBySize } from '@/types';

interface Catalog {
  sizes: PrintSize[];
  images: CatalogImage[];
  sold: Record<string, SoldBySize>;
  unavailableSizes: Record<string, string[]>;
}

interface PricedLine {
  line: BasketLine;
  image?: CatalogImage;
  size?: PrintSize;
  left: number;
  /** Why this line can't be ordered as it stands, if it can't. */
  problem: string | null;
}

const noopSubscribe = () => () => {};

const EMPTY_FORM = { firstName: '', lastName: '', email: '', phone: '', country: '', message: '', botcheck: '' };

export default function BasketClient() {
  const basket = useBasket();
  // The server can't see the saved basket; show loading, not "empty", until
  // the browser's copy is read.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const money = useMoney();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loadedFor, setLoadedFor] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const countries = useMemo(() => countryOptions(), []);

  // Refetch only when the set of photographs changes, not on every quantity.
  const idsKey = [...new Set(basket.map((l) => l.imageId))].sort().join(',');

  useEffect(() => {
    if (!idsKey) return;
    let cancelled = false;
    // Back from Stripe without paying: free those prints before counting what remains.
    releaseAbandonedCheckout()
      .then(() => fetch(`/api/prints/catalog?ids=${idsKey}`))
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: Catalog) => {
        if (cancelled) return;
        setCatalog(data);
        setLoadedFor(idsKey);
        setLoadError(false);
      })
      .catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, [idsKey]);

  // The browser's back button can restore this page from its cache, mid-"opening
  // payment" and without rerunning the effects above.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      setSending(false);
      releaseAbandonedCheckout();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const priced: PricedLine[] = basket.map((line) => {
    const image = catalog?.images.find((i) => i.id === line.imageId);
    const size = catalog?.sizes.find((s) => s.id === line.sizeId);
    const sizeUnavailable = Boolean(catalog?.unavailableSizes[ line.imageId ]?.includes(line.sizeId));
    const sold = catalog?.sold[line.imageId];
    const left = size ? remaining(size, sold) : 0;
    let problem: string | null = null;
    if (!image || !image.forSale) problem = 'This photograph is no longer available.';
    else if (!size || sizeUnavailable) problem = 'This size is not offered for this photograph. Please choose another.';
    else if (size.price_usd === null) problem = 'This size is priced on application. Please choose another or enquire.';
    else if (left === 0) problem = 'This size has sold out. Please choose another.';
    else if (line.quantity > left) problem = `Only ${left} of this edition ${left === 1 ? 'remains' : 'remain'}.`;
    return { line, image, size, left, problem };
  });

  // Removing a photograph needs no refetch: what's loaded still covers it.
  const loadedIds = new Set(loadedFor.split(','));
  const ready = catalog !== null && idsKey.split(',').every((id) => loadedIds.has(id));
  const totalUsd = priced.reduce((sum, p) => sum + (p.problem || !p.size?.price_usd ? 0 : p.size.price_usd * p.line.quantity), 0);
  const canCheckout = ready && basket.length > 0 && priced.every((p) => !p.problem);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCheckout) return;
    const missing = [!form.firstName && 'First name', !form.lastName && 'Last name', !form.email && 'Email address', !form.country && 'Country'].filter(Boolean) as string[];
    if (missing.length) {
      setError(`Please complete: ${missing.join(', ')}.`);
      setTimeout(() => document.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${['firstName','lastName','email','country'].find((name) => !form[name as keyof typeof form])}"]`)?.focus(), 0);
      return;
    }
    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/print-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer: form, currency: money.currency, items: basket }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok && !data.url) {
        // The honeypot tripped: act as though nothing happened.
        setSending(false);
        return;
      }
      if (!res.ok || !data?.url) {
        setError(data?.error || 'Payment could not be started. Please try again.');
        setSending(false);
        return;
      }

      // The basket is kept until payment completes, in case the buyer comes back.
      if (data.sessionId) rememberCheckout(data.sessionId);
      window.location.assign(data.url);
      return;
    } catch {
      setError('Could not reach the server. Please check your connection and try again.');
    }
    setSending(false);
  };

  return (
    <div className="basket-content page-enter">
      <div className="basket-heading">
        <h1>Basket</h1>
        <CurrencySelect />
      </div>

      {!hydrated ? (
        <p className="basket-loading" role="status">Loading your basket…</p>
      ) : basket.length === 0 ? (
        <div className="basket-empty">
          <p>Your basket is empty.</p>
          <p>Open any photograph in the gallery and choose <strong>Add to basket</strong>.</p>
          <Link href="/home" className="basket-button">Browse the gallery</Link>
        </div>
      ) : loadError && !ready ? (
        <p className="basket-error" role="alert">Your basket could not be loaded. Please refresh the page.</p>
      ) : !ready ? (
        <p className="basket-loading" role="status">Loading your basket…</p>
      ) : (
        <div className="basket-layout">
          <ul className="basket-lines" aria-label="Prints in your basket">
            {priced.map(({ line, image, size, left, problem }) => {
              const sold = catalog.sold[line.imageId];
              const label = image
                ? `${image.title ? `“${image.title}”, ` : ''}${image.galleryTitle}, photo ${image.position}`
                : 'Unavailable photograph';
              return (
                <li key={`${line.imageId}:${line.sizeId}`} className="basket-line">
                  <div className="basket-thumb">
                    {image?.thumbnail && (
                      <Image src={image.thumbnail} alt={label} fill unoptimized sizes="120px" />
                    )}
                  </div>

                  <div className="basket-line-body">
                    <p className="basket-line-title">
                      {image ? <Link href={`/gallery/${image.gallerySlug}`}>{label}</Link> : label}
                    </p>

                    {image?.forSale && (
                      <div className="basket-line-controls">
                        <label>
                          <span>Size</span>
                          <select
                            value={size ? line.sizeId : ''}
                            onChange={(e) => changeLineSize(line.imageId, line.sizeId, e.target.value)}
                          >
                            {!size && <option value="" disabled>Choose a size</option>}
                            {catalog.sizes.map((option) => (
                              <option
                                key={option.id}
                                value={option.id}
                                disabled={option.id !== line.sizeId && (!isPurchasable(option, sold) || catalog?.unavailableSizes[line.imageId]?.includes(option.id))}
                              >
                                {option.name}{option.dimensions ? ` ${option.dimensions}` : ''} ·{' '}
                                {option.price_usd === null ? 'POA' : money.format(option.price_usd)} ·{' '}
                                {editionLabel(option, sold)}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className="basket-quantity">
                          <span id={`qty-${line.imageId}-${line.sizeId}`}>Quantity</span>
                          <div role="group" aria-labelledby={`qty-${line.imageId}-${line.sizeId}`}>
                            <button
                              type="button"
                              aria-label="One fewer"
                              disabled={line.quantity <= 1}
                              onClick={() => setLineQuantity(line.imageId, line.sizeId, line.quantity - 1)}
                            >−</button>
                            <output aria-live="polite">{line.quantity}</output>
                            <button
                              type="button"
                              aria-label="One more"
                              disabled={!size || line.quantity >= left}
                              onClick={() => setLineQuantity(line.imageId, line.sizeId, line.quantity + 1)}
                            >+</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {size && image?.forSale && (
                      <p className="basket-line-edition">{editionLabel(size, sold)} · {left} left</p>
                    )}
                    {problem && <p className="basket-line-problem" role="alert">{problem}</p>}
                  </div>

                  <div className="basket-line-side">
                    <p className="basket-line-total">
                      {!problem && size?.price_usd != null ? money.format(size.price_usd * line.quantity) : '—'}
                    </p>
                    <button type="button" className="basket-remove" onClick={() => removeLine(line.imageId, line.sizeId)}>
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <aside className="basket-summary" aria-label="Order summary">
            <div className="basket-total">
              <span>Total</span>
              <strong>{money.format(totalUsd)}</strong>
            </div>
            {money.currency !== 'USD' && (
              <p className="basket-total-note">Prices are set in US dollars: {formatMoney(totalUsd, 'USD')}.</p>
            )}
            <p className="basket-total-note">
              Plus flat-rate shipping: {money.format(SHIPPING_USD.sweden)} within Sweden,{' '}
              {money.format(SHIPPING_USD.europe)} within Europe, {money.format(SHIPPING_USD.world)} elsewhere.
            </p>

            <form onSubmit={handleCheckout} className="basket-form">
              {error && <p className="basket-error" role="alert" aria-live="polite">{error}</p>}
              <h2>Your details</h2>
              <div className="basket-form-row">
                <label>
                  <span>First name*</span>
                  <input name="firstName" value={form.firstName} onChange={handleChange} required maxLength={80} autoComplete="given-name" />
                </label>
                <label>
                  <span>Last name*</span>
                  <input name="lastName" value={form.lastName} onChange={handleChange} required maxLength={80} autoComplete="family-name" />
                </label>
              </div>
              <label>
                <span>Email*</span>
                <input type="email" name="email" value={form.email} onChange={handleChange} required maxLength={254} autoComplete="email" />
              </label>
              <label>
                <span>Phone</span>
                <input type="tel" name="phone" value={form.phone} onChange={handleChange} maxLength={40} autoComplete="tel" />
              </label>
              <label>
                <span>Deliver to*</span>
                <select name="country" value={form.country} onChange={handleChange} required autoComplete="country">
                  <option value="">Select a country</option>
                  {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </label>
              <label>
                <span>Message</span>
                <textarea name="message" value={form.message} onChange={handleChange} rows={3} maxLength={2000}
                  placeholder="Framing, delivery or anything else we should know" />
              </label>

              {/* Honeypot: off-screen and out of the tab order. */}
              <input
                type="text" name="botcheck" value={form.botcheck} onChange={handleChange}
                tabIndex={-1} autoComplete="off" aria-hidden="true"
                style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
              />

              {error && <p className="basket-error" role="alert">{error}</p>}
              {!canCheckout && <p className="basket-total-note">Resolve the notes on your basket to check out.</p>}

              <button type="submit" className="basket-button" disabled={!canCheckout || sending}>
                {sending ? 'Opening secure payment…' : 'Continue to payment'}
              </button>
              <p className="basket-total-note">
                You&apos;ll pay by card on Stripe&apos;s secure page, where you can also enter your delivery
                address. Your prints are reserved for 30 minutes while you pay.
              </p>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
