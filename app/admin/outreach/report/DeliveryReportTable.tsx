'use client';

import { useMemo, useState } from 'react';
import type { DeliveryReportRow } from '@/lib/outreach/delivery-report';
import styles from '../Outreach.module.css';

function formatDate(value: string | null) { return value ? new Date(value).toLocaleString() : '—'; }

export default function DeliveryReportTable({ rows }: { rows: DeliveryReportRow[] }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [status, setStatus] = useState('all');
  const filtered = useMemo(() => rows.filter((row) => {
    const timestamp = row.sentAt ? new Date(row.sentAt).getTime() : 0;
    const after = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity;
    const before = to ? new Date(`${to}T23:59:59.999`).getTime() : Infinity;
    return timestamp >= after && timestamp <= before && (status === 'all' || row.status === status);
  }).sort((a, b) => {
    const left = a.sentAt ? new Date(a.sentAt).getTime() : 0;
    const right = b.sentAt ? new Date(b.sentAt).getTime() : 0;
    return sort === 'newest' ? right - left : left - right;
  }), [from, rows, sort, status, to]);

  return <>
    <div className={styles.reportFilters} aria-label="Filter delivery report"><label className={styles.filterField}>From<input className={styles.input} type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label className={styles.filterField}>To<input className={styles.input} type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label><label className={styles.filterField}>Status<select className={styles.select} value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{['submitted', 'delivered', 'opened', 'clicked', 'bounced', 'failed'].map((value) => <option key={value}>{value}</option>)}</select></label><label className={styles.filterField}>Sort<select className={styles.select} value={sort} onChange={(event) => setSort(event.target.value as 'newest' | 'oldest')}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label><span className={styles.bulkCount}>{filtered.length} of {rows.length} records</span></div>
    {filtered.length === 0 ? <div className={styles.emptyState}>No delivery records match these filters.</div> : <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>Recipient</th><th>Campaign</th><th>Status</th><th>Date sent</th><th>Delivered</th><th>Provider ID</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id}><td><strong>{row.contactName}</strong><br/><span>{row.email}</span><br/><span className={styles.panelMeta}>{row.studio}</span></td><td>{row.campaign}<br/><span>{row.subject ?? '—'}</span></td><td><span className={`${styles.chip} ${row.status === 'delivered' || row.status === 'opened' || row.status === 'clicked' ? styles.chipGood : row.status === 'bounced' || row.status === 'failed' ? styles.chipBad : styles.chipWarn}`}>{row.status}</span>{row.errorMessage && <small className={styles.sentAt}>{row.errorMessage}</small>}</td><td>{formatDate(row.sentAt)}</td><td>{formatDate(row.deliveredAt)}</td><td><code>{row.providerMessageId ?? '—'}</code></td></tr>)}</tbody></table></div>}
  </>;
}
