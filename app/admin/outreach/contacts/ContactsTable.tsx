'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { AddressBookContact } from '@/lib/outreach/address-book';
import { SENT_CONTACTS_STORAGE_KEY, sentContactMap, type SentContactRecord } from '@/lib/outreach/sent-contacts';
import styles from '../Outreach.module.css';

export default function ContactsTable({ contacts }: { contacts: AddressBookContact[] }) {
  const [sent, setSent] = useState<Record<string, SentContactRecord>>({});

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const parsed = JSON.parse(window.localStorage.getItem(SENT_CONTACTS_STORAGE_KEY) ?? '[]');
        if (Array.isArray(parsed)) setSent(sentContactMap(parsed));
      } catch {
        setSent({});
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return <div className={styles.tableScroll}>
    <table className={styles.table}><thead><tr><th>Name / studio</th><th>Primary email</th><th>Country</th><th>Source</th><th>Status</th></tr></thead><tbody>
      {contacts.map((contact) => {
        const record = sent[contact.id];
        return <tr key={contact.id} className={record ? styles.sentRow : undefined}>
          <td><Link className={styles.contactLink} href={`/admin/outreach/contacts/${contact.id}`}><strong>{contact.name}</strong><br/><span>{contact.studio} · {contact.role}</span></Link></td>
          <td><a className={`${styles.link} ${record ? styles.sentEmail : ''}`} href={`mailto:${contact.email}`}>{contact.email}</a></td>
          <td>{contact.country}</td>
          <td><a className={styles.link} href={contact.website} target="_blank" rel="noreferrer">Website ↗</a></td>
          <td>{record ? <><span className={`${styles.chip} ${styles.chipGood}`}>sent</span><small className={styles.sentAt}> {new Date(record.sentAt).toLocaleDateString()}</small></> : <span className={`${styles.chip} ${styles.chipWarn}`}>available</span>}</td>
        </tr>;
      })}
    </tbody></table>
  </div>;
}
