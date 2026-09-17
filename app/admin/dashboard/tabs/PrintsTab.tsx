'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { extractStoragePath } from '@/lib/storage-utils';
import { formatMoney } from '@/lib/currency';
import type { Gallery, GalleryImage, PrintOrder, PrintSize } from '@/types';

type Section = 'sizes' | 'details' | 'availability' | 'orders';

const INPUT = { background: '#111', border: '1px solid #444', color: '#fff', padding: '8px 12px', fontFamily: 'inherit', fontSize: 'var(--body-size)', outline: 'none', width: '100%' };
const LABEL = { display: 'block', color: '#888', fontSize: '0.7rem', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 4 };
const BUTTON = { background: '#E8001C', color: '#fff', letterSpacing: '0.1em', fontFamily: 'inherit', border: 'none', cursor: 'pointer' };
const QUIET_BUTTON = { background: 'transparent', color: '#aaa', border: '1px solid #444', fontFamily: 'inherit', cursor: 'pointer' };

export default function PrintsTab() {
  const [section, setSection] = useState<Section>('sizes');

  const TAB_BTN = (tab: Section) => ({
    padding: '6px 12px',
    fontSize: '0.7rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    fontFamily: 'inherit',
    cursor: 'pointer',
    border: '1px solid',
    borderColor: section === tab ? '#E8001C' : '#444',
    background: section === tab ? '#E8001C' : 'transparent',
    color: '#fff',
  });

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex flex-wrap gap-2 mb-6">
        <button style={TAB_BTN('sizes')} onClick={() => setSection('sizes')}>Sizes &amp; prices</button>
        <button style={TAB_BTN('details')} onClick={() => setSection('details')}>Paper &amp; certification</button>
        <button style={TAB_BTN('availability')} onClick={() => setSection('availability')}>Availability &amp; sold</button>
        <button style={TAB_BTN('orders')} onClick={() => setSection('orders')}>Orders</button>
      </div>

      {section === 'sizes' && <SizesSection />}
      {section === 'details' && <DetailsSection />}
      {section === 'availability' && <AvailabilitySection />}
      {section === 'orders' && <OrdersSection />}
    </div>
  );
}

// Sizes & prices ----------------------------------------------------------------------

interface SizeDraft {
  id: string | null;
  name: string;
  dimensions: string;
  price: string;
  edition: string;
  active: boolean;
}

function toDraft(size: PrintSize): SizeDraft {
  return {
    id: size.id,
    name: size.name,
    dimensions: size.dimensions,
    price: size.price_usd === null ? '' : String(Number(size.price_usd)),
    edition: String(size.edition_size),
    active: size.active,
  };
}

function SizesSection() {
  const [drafts, setDrafts] = useState<SizeDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('print_sizes').select('*').order('sort_order', { ascending: true });
    if (error) setMsg(`Could not load sizes: ${error.message}`);
    setDrafts((data ?? []).map(toDraft));
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.from('print_sizes').select('*').order('sort_order', { ascending: true }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) setMsg(`Could not load sizes: ${error.message}`);
      setDrafts((data ?? []).map(toDraft));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const update = (index: number, patch: Partial<SizeDraft>) =>
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));

  const move = (index: number, by: number) =>
    setDrafts((prev) => {
      const next = [...prev];
      const target = index + by;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const remove = async (index: number) => {
    const draft = drafts[index];
    if (draft.id) {
      if (!window.confirm(`Delete the ${draft.name || 'unnamed'} size? Its sold counts are deleted too. To stop selling it but keep its history, untick "Offered" instead.`)) return;
      const { error } = await supabase.from('print_sizes').delete().eq('id', draft.id);
      if (error) { setMsg(`Could not delete: ${error.message}`); return; }
    }
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  const saveAll = async () => {
    setMsg('');
    for (const d of drafts) {
      const edition = Number(d.edition);
      if (!d.name.trim()) { setMsg('Every size needs a name.'); return; }
      if (!Number.isInteger(edition) || edition < 1 || edition > 1000) { setMsg(`${d.name}: the edition size must be a whole number from 1 to 1000.`); return; }
      if (d.price.trim() && !(Number(d.price) >= 0)) { setMsg(`${d.name}: the price must be a number, or empty for POA.`); return; }
    }

    setSaving(true);
    for (const [index, d] of drafts.entries()) {
      const row = {
        name: d.name.trim(),
        dimensions: d.dimensions.trim(),
        price_usd: d.price.trim() ? Number(d.price) : null,
        edition_size: Number(d.edition),
        sort_order: index,
        active: d.active,
      };
      const { error } = d.id
        ? await supabase.from('print_sizes').update(row).eq('id', d.id)
        : await supabase.from('print_sizes').insert(row);
      if (error) {
        setSaving(false);
        setMsg(`Could not save ${d.name}: ${error.message}`);
        return;
      }
    }
    setSaving(false);
    setMsg('Saved. The prints page and galleries now show these sizes.');
    await load();
  };

  if (loading) return <p className="text-grey-mid text-base">Loading…</p>;

  return (
    <div className="max-w-4xl flex flex-col gap-4">
      <p className="text-grey-mid text-base">
        Every photograph is sold in these sizes, and each size is its own edition. Prices are in US dollars;
        buyers can view them in their own currency. Leave the price empty to show POA (not purchasable).
      </p>

      {drafts.map((d, index) => (
        <div key={d.id ?? `new-${index}`} className="grid gap-3 p-4" style={{ border: '1px solid #333', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          <div>
            <label style={LABEL}>Name</label>
            <input style={INPUT} value={d.name} onChange={(e) => update(index, { name: e.target.value })} placeholder="e.g. Small" maxLength={40} />
          </div>
          <div>
            <label style={LABEL}>Dimensions</label>
            <input style={INPUT} value={d.dimensions} onChange={(e) => update(index, { dimensions: e.target.value })} placeholder='e.g. 12 × 16"' maxLength={40} />
          </div>
          <div>
            <label style={LABEL}>Price (USD)</label>
            <input style={INPUT} inputMode="decimal" value={d.price} onChange={(e) => update(index, { price: e.target.value })} placeholder="POA" />
          </div>
          <div>
            <label style={LABEL}>Edition size</label>
            <input style={INPUT} inputMode="numeric" value={d.edition} onChange={(e) => update(index, { edition: e.target.value })} placeholder="10" />
          </div>
          <div className="flex items-end gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-white text-base" style={{ height: 38 }}>
              <input type="checkbox" checked={d.active} onChange={(e) => update(index, { active: e.target.checked })} />
              Offered
            </label>
            <button type="button" style={{ ...QUIET_BUTTON, padding: '6px 10px' }} onClick={() => move(index, -1)} aria-label={`Move ${d.name} up`}>↑</button>
            <button type="button" style={{ ...QUIET_BUTTON, padding: '6px 10px' }} onClick={() => move(index, 1)} aria-label={`Move ${d.name} down`}>↓</button>
            <button type="button" style={{ ...QUIET_BUTTON, padding: '6px 10px' }} onClick={() => remove(index)}>Delete</button>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          style={{ ...QUIET_BUTTON, padding: '8px 14px', fontSize: '0.75rem' }}
          onClick={() => setDrafts((prev) => [...prev, { id: null, name: '', dimensions: '', price: '', edition: '10', active: true }])}
        >
          + Add size
        </button>
        <button type="button" onClick={saveAll} disabled={saving} className="px-6 h-9 text-xs uppercase font-medium" style={BUTTON}>
          {saving ? 'Saving…' : 'Save sizes'}
        </button>
      </div>
      {msg && <p className="text-grey-mid text-base">{msg}</p>}
    </div>
  );
}

// Paper & certification -------------------------------------------------------------------

const DETAIL_KEYS = ['paper_heading', 'paper_items', 'certification_heading', 'certification_items'] as const;

function DetailsSection() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    supabase.from('page_content').select('key, value').eq('page', 'prints').in('key', [...DETAIL_KEYS]).then(({ data }) => {
      if (cancelled) return;
      setValues(Object.fromEntries((data ?? []).map((row) => [row.key, row.value ?? ''])));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg('');
    const { error } = await supabase
      .from('page_content')
      .upsert(DETAIL_KEYS.map((key) => ({ page: 'prints', key, value: values[key] ?? '' })), { onConflict: 'page,key' });
    setSaving(false);
    setMsg(error ? `Could not save: ${error.message}` : 'Saved. The prints page shows the new text now.');
  };

  if (loading) return <p className="text-grey-mid text-base">Loading…</p>;

  const field = (key: (typeof DETAIL_KEYS)[number]) => ({
    value: values[key] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues((p) => ({ ...p, [key]: e.target.value })),
  });

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <p className="text-grey-mid text-base">One point per line. Leave a list empty to hide that section.</p>
      {(['paper', 'certification'] as const).map((group) => (
        <div key={group} className="flex flex-col gap-3">
          <div>
            <label style={LABEL}>{group === 'paper' ? 'Paper & quality heading' : 'Certification heading'}</label>
            <input style={INPUT} maxLength={60} {...field(`${group}_heading`)} />
          </div>
          <div>
            <label style={LABEL}>Points</label>
            <textarea style={{ ...INPUT, minHeight: 140, resize: 'vertical' }} {...field(`${group}_items`)} />
          </div>
        </div>
      ))}
      <button type="button" onClick={save} disabled={saving} className="px-6 h-9 text-xs uppercase font-medium w-fit" style={BUTTON}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      {msg && <p className="text-grey-mid text-base">{msg}</p>}
    </div>
  );
}

// Availability & sold ----------------------------------------------------------------------

function AvailabilitySection() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [galleryId, setGalleryId] = useState('');
  const [sizes, setSizes] = useState<PrintSize[]>([]);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [sold, setSold] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase.from('galleries').select('*').order('sort_order', { ascending: true }),
      supabase.from('print_sizes').select('*').order('sort_order', { ascending: true }),
    ]).then(([g, s]) => {
      if (cancelled) return;
      setGalleries(g.data ?? []);
      setSizes((s.data ?? []).filter((size: PrintSize) => size.active));
      if (g.data?.[0]) setGalleryId(g.data[0].id);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!galleryId) return;
    let cancelled = false;
    (async () => {
      const { data: rows } = await supabase
        .from('gallery_images').select('*').eq('gallery_id', galleryId).order('sort_order', { ascending: true });
      const list: GalleryImage[] = rows ?? [];
      const { data: sales } = list.length
        ? await supabase.from('print_sales').select('image_id, size_id, sold').in('image_id', list.map((i) => i.id))
        : { data: [] };
      const urls: Record<string, string> = {};
      await Promise.all(list.map(async (img) => {
        const { data: signed } = await supabase.storage
          .from('gallery-images').createSignedUrl(extractStoragePath(img.storage_path, 'gallery-images'), 3600);
        if (signed) urls[img.id] = signed.signedUrl;
      }));
      if (cancelled) return;
      setImages(list);
      setThumbs(urls);
      setSold(Object.fromEntries((sales ?? []).map((row) => [`${row.image_id}:${row.size_id}`, String(row.sold)])));
    })();
    return () => { cancelled = true; };
  }, [galleryId]);

  const toggleForSale = async (image: GalleryImage) => {
    const next = image.for_sale === false;
    setImages((prev) => prev.map((i) => (i.id === image.id ? { ...i, for_sale: next } : i)));
    const { error } = await supabase.from('gallery_images').update({ for_sale: next }).eq('id', image.id);
    setStatus(error ? `Could not update: ${error.message}` : next ? 'Now for sale.' : 'Taken off sale.');
  };

  const saveSold = async (imageId: string, size: PrintSize, raw: string) => {
    const count = Number(raw || 0);
    if (!Number.isInteger(count) || count < 0 || count > size.edition_size) {
      setStatus(`${size.name}: sold must be a whole number from 0 to ${size.edition_size}.`);
      return;
    }
    const { error } = await supabase
      .from('print_sales')
      .upsert({ image_id: imageId, size_id: size.id, sold: count, updated_at: new Date().toISOString() }, { onConflict: 'image_id,size_id' });
    setStatus(error ? `Could not save: ${error.message}` : 'Sold count saved.');
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-grey-mid text-base max-w-3xl">
        Orders never change these numbers: update a sold count once a buyer has paid. Buyers see
        &ldquo;3 of 10 sold&rdquo; and can&apos;t order more than remain.
      </p>
      <div className="max-w-sm">
        <label style={LABEL}>Gallery</label>
        <select style={INPUT} value={galleryId} onChange={(e) => setGalleryId(e.target.value)}>
          {galleries.map((g) => <option key={g.id} value={g.id}>{g.title}{g.published ? '' : ' (unpublished)'}</option>)}
        </select>
      </div>
      {status && <p className="text-grey-mid text-base" role="status">{status}</p>}

      <div className="flex flex-col">
        {images.map((image, index) => (
          <div key={image.id} className="flex flex-wrap items-center gap-4 py-3" style={{ borderTop: '1px solid #2a2a2a' }}>
            <div className="relative shrink-0" style={{ width: 56, height: 70, background: '#111' }}>
              {thumbs[image.id] && <Image src={thumbs[image.id]} alt={`Photo ${index + 1}`} fill unoptimized className="object-cover" sizes="56px" />}
            </div>
            <div style={{ minWidth: 90 }}>
              <p className="text-white text-base">Photo {index + 1}</p>
              <label className="flex items-center gap-2 text-xs mt-1" style={{ color: image.for_sale === false ? '#888' : '#fff' }}>
                <input type="checkbox" checked={image.for_sale !== false} onChange={() => toggleForSale(image)} />
                For sale
              </label>
            </div>
            <div className="flex flex-wrap gap-3">
              {sizes.map((size) => {
                const key = `${image.id}:${size.id}`;
                return (
                  <label key={size.id} className="flex flex-col text-xs" style={{ color: '#888', minWidth: 96 }}>
                    <span>{size.name} sold</span>
                    <span className="flex items-center gap-1">
                      <input
                        style={{ ...INPUT, width: 'calc(3ch + 16px)', padding: '6px 8px' }}
                        inputMode="numeric"
                        value={sold[key] ?? '0'}
                        onChange={(e) => setSold((p) => ({ ...p, [key]: e.target.value }))}
                        onBlur={(e) => saveSold(image.id, size, e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                        aria-label={`Photo ${index + 1}, ${size.name}: number sold of ${size.edition_size}`}
                      />
                      <span>/ {size.edition_size}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Orders ---------------------------------------------------------------------------------

const STATUSES: PrintOrder['status'][] = ['pending_payment', 'paid', 'expired', 'cancelled', 'new', 'contacted'];

const STATUS_LABELS: Record<PrintOrder['status'], string> = {
  pending_payment: 'awaiting payment',
  paid: 'paid',
  expired: 'not paid',
  cancelled: 'cancelled',
  new: 'new',
  contacted: 'contacted',
};

function OrdersSection() {
  const [orders, setOrders] = useState<PrintOrder[] | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    supabase.from('print_orders').select('*').order('created_at', { ascending: false }).limit(100).then(({ data, error }) => {
      if (cancelled) return;
      if (error) setMsg(`Could not load orders: ${error.message}`);
      setOrders(data ?? []);
    });
    return () => { cancelled = true; };
  }, []);

  const setStatus = async (order: PrintOrder, status: PrintOrder['status']) => {
    setOrders((prev) => prev?.map((o) => (o.id === order.id ? { ...o, status } : o)) ?? prev);
    const { error } = await supabase.from('print_orders').update({ status }).eq('id', order.id);
    setMsg(error ? `Could not update ${order.reference}: ${error.message}` : `${order.reference} marked ${STATUS_LABELS[status]}.`);
  };

  if (!orders) return <p className="text-grey-mid text-base">Loading…</p>;

  return (
    <div className="max-w-4xl flex flex-col gap-4">
      <p className="text-grey-mid text-base">
        Every checkout is recorded here. Card payments mark their order paid, update sold counts and email you on
        their own. An order left awaiting payment holds its prints for 30 minutes, then lapses to not paid. Changing
        a status by hand doesn&apos;t change sold counts; update those under Availability &amp; sold.
      </p>
      {msg && <p className="text-grey-mid text-base" role="status">{msg}</p>}
      {orders.length === 0 && <p className="text-white text-base">No orders yet.</p>}

      {orders.map((order) => (
        <div key={order.id} className="p-4 flex flex-col gap-3" style={{ border: '1px solid #333' }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-white text-base font-bold">{order.reference} · {formatMoney(Number(order.total_usd), 'USD')}</p>
              <p className="text-grey-mid text-base mt-1">
                {new Date(order.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                {order.currency !== 'USD' && ` · viewed in ${order.currency} (≈ ${formatMoney(Number(order.total_usd) * Number(order.exchange_rate), order.currency)})`}
              </p>
            </div>
            <select
              style={{ ...INPUT, width: 140 }}
              value={order.status}
              onChange={(e) => setStatus(order, e.target.value as PrintOrder['status'])}
              aria-label={`Status of ${order.reference}`}
            >
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>

          <p className="text-white text-base">
            {order.first_name} {order.last_name} · <a href={`mailto:${order.email}?subject=${encodeURIComponent(`Your print order ${order.reference}`)}`} className="underline">{order.email}</a>
            {order.phone && ` · ${order.phone}`}{order.country && ` · ${order.country}`}
          </p>
          {order.message && <p className="text-grey-mid text-base whitespace-pre-line">&ldquo;{order.message}&rdquo;</p>}
          {order.shipping_address && (
            <p className="text-grey-mid text-base">
              Deliver to: {[order.shipping_address.name, order.shipping_address.address.line1, order.shipping_address.address.line2,
                [order.shipping_address.address.postal_code, order.shipping_address.address.city].filter(Boolean).join(' '),
                order.shipping_address.address.state, order.shipping_address.address.country].filter(Boolean).join(', ')}
              {order.shipping_usd != null && ` · shipping ${formatMoney(Number(order.shipping_usd), 'USD')}`}
            </p>
          )}

          <ul className="flex flex-col gap-1">
            {order.lines.map((line) => (
              <li key={`${line.image_id}:${line.size_id}`} className="text-base" style={{ color: '#ccc' }}>
                {line.quantity} × {line.gallery_title}, photo {line.position} (ref {line.file_ref}) · {line.size_name}
                {line.dimensions && ` ${line.dimensions}`} · {formatMoney(Number(line.unit_price_usd), 'USD')} each ·{' '}
                {line.sold} of {line.edition_size} sold at the time
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
