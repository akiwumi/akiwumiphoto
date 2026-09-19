'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { AddressBookContact } from '@/lib/outreach/address-book';
import { ERASED_CONTACTS_STORAGE_KEY, SENT_CONTACTS_STORAGE_KEY, sentContactMap, type SentContactRecord } from '@/lib/outreach/sent-contacts';
import styles from '../Outreach.module.css';

export default function ContactsTable({ contacts }: { contacts: AddressBookContact[] }) {
  const [sent, setSent] = useState<Record<string, SentContactRecord>>({});
  const [visibleContacts, setVisibleContacts] = useState(contacts);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const parsed = JSON.parse(window.localStorage.getItem(SENT_CONTACTS_STORAGE_KEY) ?? '[]');
        if (Array.isArray(parsed)) setSent(sentContactMap(parsed));
        const erased = JSON.parse(window.localStorage.getItem(ERASED_CONTACTS_STORAGE_KEY) ?? '[]');
        if (Array.isArray(erased)) setVisibleContacts(contacts.filter((contact) => !erased.includes(contact.id)));
      } catch {
        setSent({});
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [contacts]);

  function resetSent() {
    if (!window.confirm('Reset sent history for every contact? This will allow those addresses to be selected again.')) return;
    window.localStorage.removeItem(SENT_CONTACTS_STORAGE_KEY);
    setSent({});
  }

  function eraseContact(contact: AddressBookContact) {
    if (!window.confirm(`Erase ${contact.name} from the local address book?`)) return;
    const erased = JSON.parse(window.localStorage.getItem(ERASED_CONTACTS_STORAGE_KEY) ?? '[]');
    const next = Array.isArray(erased) ? [...new Set([...erased, contact.id])] : [contact.id];
    window.localStorage.setItem(ERASED_CONTACTS_STORAGE_KEY, JSON.stringify(next));
    setVisibleContacts((current) => current.filter((entry) => entry.id !== contact.id));
  }

  return <>
    <div className={styles.bulkToolbar}><span className={styles.bulkCount}>{visibleContacts.length} visible · sent history protects against duplicates</span><button type="button" className={styles.smallButtonDanger} onClick={resetSent}>Reset sent history</button></div>
    <div className={styles.tableScroll}>
    <table className={styles.table}><thead><tr><th>Name / studio</th><th>Primary email</th><th>Country</th><th>Source</th><th>Status</th></tr></thead><tbody>
      {visibleContacts.map((contact) => {
        const record = sent[contact.id];
        return <tr key={contact.id} className={record ? styles.sentRow : undefined}>
          <td><Link className={styles.contactLink} href={`/admin/outreach/contacts/${contact.id}`}><strong>{contact.name}</strong><br/><span>{contact.studio} · {contact.role}</span></Link></td>
          <td><a className={`${styles.link} ${record ? styles.sentEmail : ''}`} href={`mailto:${contact.email}`}>{contact.email}</a></td>
          <td>{contact.country}</td>
          <td><a className={styles.link} href={contact.website} target="_blank" rel="noreferrer">Website ↗</a></td>
          <td><div className={styles.rowActions}>{record ? <><span className={`${styles.chip} ${styles.chipGood}`}>sent</span><small className={styles.sentAt}> {new Date(record.sentAt).toLocaleDateString()}</small></> : <span className={`${styles.chip} ${styles.chipWarn}`}>available</span>}<button type="button" className={styles.smallButtonDanger} onClick={() => eraseContact(contact)}>Erase</button></div></td>
        </tr>;
      })}
    </tbody></table>
    </div>
  </>;
}
