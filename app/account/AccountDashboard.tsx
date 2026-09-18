import Link from 'next/link';
import type { AccountData, AccountOrderLine } from '@/lib/account-data';
import SerialNumberRequestButton from './SerialNumberRequestButton';
import FavoritesPanel from '@/components/FavoritesPanel';

function money(value: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(value);
}

function lineName(line: AccountOrderLine) {
  return String(line.image_title ?? line.title ?? line.artwork_title ?? line.gallery_title ?? 'Print');
}

function lineAmount(line: AccountOrderLine, order: AccountData['orders'][number]) {
  const amountUsd = Number(line.line_total_usd ?? line.line_total ?? line.total ?? line.price ?? 0);
  return Number.isFinite(amountUsd) ? money(amountUsd * order.exchange_rate, order.currency) : null;
}

function addressLines(address: AccountData['orders'][number]['shipping_address']) {
  if (!address) return [];
  return [address.name, address.line1, address.line2, [address.city, address.state, address.postal_code].filter(Boolean).join(', '), address.country].filter((line): line is string => Boolean(line));
}

export default function AccountDashboard({ email, data }: { email: string; data: AccountData }) {
  return (
    <div className="register-layout" style={{ alignItems: 'start' }}>
      <section className="register-panel" aria-labelledby="account-purchases-title">
        <h2 id="account-purchases-title" className="register-section-title">Your purchases</h2>
        <p style={{ color: 'var(--site-text)', marginBottom: 24 }}>{email}</p>
        <p className="account-dispatch-notice">Prints ship within 7 working days of your order being made.</p>
        {data.orders.length === 0 ? (
          <p>No paid print purchases are linked to this account yet.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {data.orders.map((order) => (
              <article key={order.id} style={{ borderTop: '1px solid var(--site-control-border)', paddingTop: 18 }}>
                <div className="flex flex-wrap justify-between gap-3">
                  <div><strong>{order.reference}</strong><div style={{ color: 'var(--site-text)', fontSize: 14 }}>{new Date(order.created_at).toLocaleDateString()}</div></div>
                  <div style={{ textAlign: 'right' }}><strong>{money((order.total_usd + order.shipping_usd) * order.exchange_rate, order.currency)}</strong><div style={{ color: 'var(--site-text)', textTransform: 'capitalize', fontSize: 14 }}>{order.status}</div></div>
                </div>
                <ul style={{ margin: '16px 0 0', padding: 0, listStyle: 'none' }}>
                  {order.lines.map((line, index) => <li key={`${order.id}-${index}`} className="flex justify-between gap-4" style={{ padding: '8px 0', borderBottom: '1px solid var(--site-control-border)' }}><span>{lineName(line)}{line.size_name ?? line.size ? ` · ${line.size_name ?? line.size}` : ''}{line.quantity && line.quantity > 1 ? ` × ${line.quantity}` : ''}</span><span>{lineAmount(line, order) ?? 'Included'}</span></li>)}
                </ul>
                <div className="flex justify-between gap-4" style={{ marginTop: 12, color: 'var(--site-text)' }}><span>Shipping</span><span>{order.shipping_usd > 0 ? money(order.shipping_usd * order.exchange_rate, order.currency) : 'Free'}</span></div>
                {order.shipping_address && <div style={{ marginTop: 14, color: 'var(--site-text)', fontSize: 14 }}><strong style={{ color: 'var(--site-text)' }}>Delivery</strong>{addressLines(order.shipping_address).map((line, index) => <div key={`${order.id}-address-${index}`}>{line}</div>)}</div>}
                <div style={{ marginTop: 12, color: 'var(--site-text)', fontSize: 14 }}>Dispatch status: {order.status === 'paid' ? 'Preparing for dispatch' : order.status}</div>
              </article>
            ))}
          </div>
        )}
      </section>

      <aside className="flex flex-col gap-6">
        <FavoritesPanel />
        <section className="register-panel" aria-labelledby="account-registrations-title">
          <h2 id="account-registrations-title" className="register-section-title">Print registrations</h2>
          <p style={{ color: 'var(--site-text)', lineHeight: 1.6 }}>Register a purchased print to keep its provenance and certificate with your account.</p>
          <Link href="/register" className="register-submit btn-lift" style={{ display: 'inline-flex', justifyContent: 'center', textDecoration: 'none', marginTop: 18 }}>Register a print</Link>
          {data.registrations.length > 0 && <div style={{ marginTop: 24 }} className="flex flex-col gap-4">{data.registrations.map((registration) => <div key={registration.id} style={{ borderTop: '1px solid var(--site-control-border)', paddingTop: 14 }}><strong>{registration.artwork_title}</strong><div style={{ color: 'var(--site-text)', fontSize: 14 }}>{new Date(registration.created_at).toLocaleDateString()} · <span style={{ textTransform: 'capitalize' }}>{registration.status}</span></div></div>)}</div>}
        </section>
        <section className="register-panel" aria-labelledby="account-certificates-title">
          <h2 id="account-certificates-title" className="register-section-title">Certificates</h2>
          {data.certificates.length === 0 ? <p>No certificates have been created for your registered prints yet.</p> : <div className="flex flex-col gap-4">{data.certificates.map((certificate) => <article key={certificate.id} style={{ borderTop: '1px solid var(--site-control-border)', paddingTop: 14 }}><strong>{certificate.image_snapshot?.title ?? 'Registered print'}</strong><p style={{ margin: '6px 0', color: 'var(--site-text)' }}>Certificate {certificate.print_number}/{certificate.edition_total} · {certificate.status}</p><p style={{ margin: 0, color: 'var(--site-text)', fontSize: 14 }}>Order {certificate.order_number} · {certificate.location}</p>{certificate.serial_number ? <p style={{ margin: '8px 0', color: 'var(--site-text)' }}>Registered number: <strong>{certificate.serial_number}</strong></p> : <SerialNumberRequestButton certificateId={certificate.id} status={certificate.serial_request_status} />}<Link href={`/account/certificates/${certificate.id}`} className="register-submit btn-lift" style={{ display: 'inline-flex', justifyContent: 'center', textDecoration: 'none', marginTop: 12 }}>View certificate</Link></article>)}</div>}
        </section>
      </aside>
    </div>
  );
}
