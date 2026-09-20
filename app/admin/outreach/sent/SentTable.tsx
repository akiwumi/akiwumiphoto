'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { AddressBookContact } from '@/lib/outreach/address-book';
import { ERASED_CONTACTS_STORAGE_KEY, SENT_CONTACTS_STORAGE_KEY, type SentContactRecord } from '@/lib/outreach/sent-contacts';
import styles from '../Outreach.module.css';

function recordKey(record: SentContactRecord): string { return `${record.contactId}-${record.sentAt}`; }

export default function SentTable({ contacts }: { contacts: AddressBookContact[] }) {
  const [records, setRecords] = useState<SentContactRecord[]>([]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = JSON.parse(window.localStorage.getItem(SENT_CONTACTS_STORAGE_KEY) ?? '[]');
        const erased = JSON.parse(window.localStorage.getItem(ERASED_CONTACTS_STORAGE_KEY) ?? '[]');
        if (Array.isArray(stored)) setRecords(stored.filter((record) => !Array.isArray(erased) || !erased.includes(record.contactId)).sort((a, b) => b.sentAt.localeCompare(a.sentAt)));
      } catch { setRecords([]); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function erase(record: SentContactRecord) {
    if (!window.confirm(`Erase the recorded email to ${record.email}? This will make the address available to send again.`)) return;
    const next = records.filter((entry) => recordKey(entry) !== recordKey(record));
    window.localStorage.setItem(SENT_CONTACTS_STORAGE_KEY, JSON.stringify(next));
    setRecords(next);
    if (expandedKey === recordKey(record)) setExpandedKey(null);
  }

  if (records.length === 0) return <div className={styles.emptyState}>No local sends recorded yet. <Link className={styles.link} href="/admin/outreach/campaigns/new">Prepare a campaign →</Link></div>;
  return <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>Recipient</th><th>Subject</th><th>Sent</th><th>Provider record</th><th>Actions</th></tr></thead><tbody>{records.map((record) => { const contact = contacts.find((entry) => entry.id === record.contactId); const key = recordKey(record); const expanded = expandedKey === key; return <>
    <tr key={key} className={styles.sentRow}><td><strong>{contact?.name ?? record.email}</strong><br/><span className={styles.sentEmail}>{record.email}</span></td><td>{record.subject ?? 'Personalized mailer'}</td><td>{new Date(record.sentAt).toLocaleString()}</td><td><code>{record.providerMessageId ?? 'local record'}</code></td><td><div className={styles.rowActions}><button type="button" className={styles.smallButton} onClick={() => setExpandedKey(expanded ? null : key)}>{expanded ? 'Hide' : 'View'}</button><button type="button" className={styles.smallButtonDanger} onClick={() => erase(record)}>Erase</button></div></td></tr>
    {expanded && <tr key={`${key}-detail`}><td className={styles.sentDetail} colSpan={5}><div className={styles.sentDetailGrid}>{record.html ? <iframe className={styles.sentPreview} title={`Sent email to ${record.email}`} srcDoc={record.html} /> : <div className={styles.notice}>This older local record does not contain a saved HTML preview.</div>}<div><p className={styles.panelMeta}>Plain-text copy</p><pre className={styles.sentText}>{record.text ?? 'No saved plain-text copy.'}</pre></div></div></td></tr>}
  </>; })}</tbody></table></div>;
}
