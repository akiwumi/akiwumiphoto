'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ADDRESS_BOOK } from '@/lib/outreach/address-book';
import { ERASED_CONTACTS_STORAGE_KEY, SENT_CONTACTS_STORAGE_KEY, type SentContactRecord } from '@/lib/outreach/sent-contacts';
import styles from '../Outreach.module.css';

export default function SentTable() {
  const [records, setRecords] = useState<SentContactRecord[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = JSON.parse(window.localStorage.getItem(SENT_CONTACTS_STORAGE_KEY) ?? '[]');
        const erased = JSON.parse(window.localStorage.getItem(ERASED_CONTACTS_STORAGE_KEY) ?? '[]');
        if (Array.isArray(stored)) setRecords(stored.filter((record) => !Array.isArray(erased) || !erased.includes(record.contactId)).sort((a, b) => b.sentAt.localeCompare(a.sentAt)));
      } catch {
        setRecords([]);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return records.length === 0 ? <div className={styles.emptyState}>No local sends recorded yet. <Link className={styles.link} href="/admin/outreach/campaigns/new">Prepare a campaign →</Link></div> : <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>Recipient</th><th>Subject</th><th>Sent</th><th>Provider record</th><th>Status</th></tr></thead><tbody>{records.map((record) => { const contact = ADDRESS_BOOK.find((entry) => entry.id === record.contactId); return <tr key={`${record.contactId}-${record.sentAt}`} className={styles.sentRow}><td><strong>{contact?.name ?? record.email}</strong><br/><span className={styles.sentEmail}>{record.email}</span></td><td>{record.subject ?? 'Personalized mailer'}</td><td>{new Date(record.sentAt).toLocaleString()}</td><td><code>{record.providerMessageId ?? 'local record'}</code></td><td><span className={`${styles.chip} ${styles.chipGood}`}>sent</span></td></tr>; })}</tbody></table></div>;
}
