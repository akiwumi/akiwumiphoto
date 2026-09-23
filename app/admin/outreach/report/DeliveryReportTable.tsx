'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { deliveryReportCategories, deliveryReportCountries, filterDeliveryReportRows } from '@/lib/outreach/delivery-report';
import type { DeliveryReportRow } from '@/lib/outreach/delivery-report';
import styles from '../Outreach.module.css';

function formatDate(value: string | null) { return value ? new Date(value).toLocaleString() : '—'; }

export default function DeliveryReportTable({ rows }: { rows: DeliveryReportRow[] }) {
  const [reportRows, setReportRows] = useState(rows);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [country, setCountry] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [status, setStatus] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const refreshReport = useCallback(async () => {
    if (document.visibilityState === 'hidden') return;
    setRefreshing(true);
    try {
      const response = await fetch('/api/admin/outreach/report', { cache: 'no-store' });
      const result = await response.json() as { rows?: DeliveryReportRow[] };
      if (!response.ok || !result.rows) throw new Error('Unable to refresh delivery report.');
      setReportRows(result.rows);
      const rowIds = new Set(result.rows.map((row) => row.id));
      setSelectedIds((previous) => new Set([...previous].filter((id) => rowIds.has(id))));
    } catch {
      setErrorMessage('Live delivery refresh is temporarily unavailable.');
    } finally {
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    const onVisibilityChange = () => { if (document.visibilityState === 'visible') void refreshReport(); };
    document.addEventListener('visibilitychange', onVisibilityChange);
    const timer = window.setInterval(() => void refreshReport(), 15_000);
    return () => { document.removeEventListener('visibilitychange', onVisibilityChange); window.clearInterval(timer); };
  }, [refreshReport]);
  const countries = useMemo(() => deliveryReportCountries(reportRows), [reportRows]);
  const categories = useMemo(() => deliveryReportCategories(reportRows), [reportRows]);
  const filtered = useMemo(() => filterDeliveryReportRows(reportRows, { country, category, status, from, to }).sort((a, b) => {
    const left = a.sentAt ? new Date(a.sentAt).getTime() : 0;
    const right = b.sentAt ? new Date(b.sentAt).getTime() : 0;
    return sort === 'newest' ? right - left : left - right;
  }), [category, country, from, reportRows, sort, status, to]);
  const visibleIds = useMemo(() => filtered.map((row) => row.id), [filtered]);
  const selectedVisibleIds = useMemo(() => visibleIds.filter((id) => selectedIds.has(id)), [selectedIds, visibleIds]);
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleIds.length === visibleIds.length;

  function toggleSelected(id: string) {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  }

  async function erase(ids: string[]) {
    if (ids.length === 0 || !confirm(`Erase ${ids.length === 1 ? 'this delivery record' : `${ids.length} delivery records`}?`)) return;
    setDeleting(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/admin/outreach/report', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) throw new Error('Unable to erase delivery records.');
      setReportRows((previous) => previous.filter((row) => !ids.includes(row.id)));
      setSelectedIds((previous) => {
        const next = new Set(previous);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    } catch {
      setErrorMessage('Unable to erase delivery records.');
    } finally {
      setDeleting(false);
    }
  }

  return <>
    <div className={styles.reportFilters} aria-label="Filter delivery report"><label className={styles.filterField}>From<input className={styles.input} type="date" value={from} onChange={(event) => setFrom(event.target.value)} disabled={deleting} /></label><label className={styles.filterField}>To<input className={styles.input} type="date" value={to} onChange={(event) => setTo(event.target.value)} disabled={deleting} /></label><label className={styles.filterField}>Country<select className={styles.select} value={country} onChange={(event) => setCountry(event.target.value)} disabled={deleting}><option value="">All countries</option>{countries.map((value) => <option key={value}>{value}</option>)}</select></label><label className={styles.filterField}>Category<select className={styles.select} value={category} onChange={(event) => setCategory(event.target.value)} disabled={deleting}><option value="">All categories</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></label><label className={styles.filterField}>Status<select className={styles.select} value={status} onChange={(event) => setStatus(event.target.value)} disabled={deleting}><option value="all">All statuses</option>{['submitted', 'delivered', 'opened', 'clicked', 'bounced', 'failed'].map((value) => <option key={value}>{value}</option>)}</select></label><label className={styles.filterField}>Sort<select className={styles.select} value={sort} onChange={(event) => setSort(event.target.value as 'newest' | 'oldest')} disabled={deleting}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label><span className={styles.bulkCount}>{filtered.length} of {reportRows.length} records · live every 15 seconds</span><button type="button" className={styles.smallButton} onClick={() => void refreshReport()} disabled={deleting || refreshing}>{refreshing ? 'Refreshing…' : 'Refresh now'}</button>{selectedVisibleIds.length > 0 && <button type="button" className={styles.smallButtonDanger} onClick={() => erase(selectedVisibleIds)} disabled={deleting}>Erase selected ({selectedVisibleIds.length})</button>}</div>
    {errorMessage && <div className={styles.editorHint} role="alert">{errorMessage}</div>}
    {filtered.length === 0 ? <div className={styles.emptyState}>No delivery records match these filters.</div> : <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th><input className={styles.checkbox} type="checkbox" aria-label="Select all visible delivery records" checked={allVisibleSelected} onChange={toggleAllVisible} disabled={deleting} /></th><th>Recipient</th><th>Campaign</th><th>Category</th><th>Status</th><th>Date sent</th><th>Delivered</th><th>Provider ID</th><th><span className={styles.srOnly}>Actions</span></th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id}><td><input className={styles.checkbox} type="checkbox" aria-label={`Select ${row.email}`} checked={selectedIds.has(row.id)} onChange={() => toggleSelected(row.id)} disabled={deleting} /></td><td><strong>{row.contactName}</strong><br/><span>{row.email}</span><br/><span className={styles.panelMeta}>{row.studio}</span></td><td>{row.campaign}<br/><span>{row.subject ?? '—'}</span></td><td>{row.category}</td><td><span className={`${styles.chip} ${row.status === 'delivered' || row.status === 'opened' || row.status === 'clicked' ? styles.chipGood : row.status === 'bounced' || row.status === 'failed' ? styles.chipBad : styles.chipWarn}`}>{row.status}</span>{row.errorMessage && <small className={styles.sentAt}>{row.errorMessage}</small>}</td><td>{formatDate(row.sentAt)}</td><td>{formatDate(row.deliveredAt)}</td><td><code>{row.providerMessageId ?? '—'}</code></td><td><button type="button" className={styles.smallButtonDanger} onClick={() => erase([row.id])} disabled={deleting}>Erase</button></td></tr>)}</tbody></table></div>}
  </>;
}
