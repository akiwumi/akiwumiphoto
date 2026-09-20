'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { AddressBookContact } from '@/lib/outreach/address-book';
import { ERASED_CONTACTS_STORAGE_KEY, MANUAL_CONTACTS_STORAGE_KEY } from '@/lib/outreach/sent-contacts';
import styles from '../../Outreach.module.css';

export default function ContactDetailClient({ id, contacts: initialContacts }: { id: string; contacts: AddressBookContact[] }) {
  const [contact, setContact] = useState(() => initialContacts.find((candidate) => candidate.id === id));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const manual = JSON.parse(window.localStorage.getItem(MANUAL_CONTACTS_STORAGE_KEY) ?? '[]');
        const all = Array.isArray(manual) ? [...initialContacts, ...manual] : initialContacts;
        const erased = JSON.parse(window.localStorage.getItem(ERASED_CONTACTS_STORAGE_KEY) ?? '[]');
        if (Array.isArray(erased) && erased.includes(id)) setContact(undefined);
        else setContact(all.find((candidate) => candidate.id === id));
      } catch {
        setContact(initialContacts.find((candidate) => candidate.id === id));
      } finally { setLoading(false); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [id, initialContacts]);

  if (loading) return <div className={styles.page}><p className={styles.notice}>Loading contact record…</p></div>;
  if (!contact) return <div className={styles.page}><h1 className={styles.title}>Contact not found</h1><Link className={styles.link} href="/admin/outreach/contacts">Back to address book</Link></div>;
  return <div className={styles.page}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Contact detail · {contact.country}</p><h1 className={styles.title}>{contact.name}</h1><p className={styles.subtitle}>{contact.studio} · {contact.role} · {contact.email}</p></div><Link className={styles.buttonSecondary} href="/admin/outreach/contacts">Back to address book</Link></header>
    <section className={styles.grid}>{[['Approval', contact.approvedForOutreach ? 'Approved' : 'Needs review', 'Manual approval required'], ['Reply', contact.replied ? 'Yes' : 'No', 'Manual status'], ['Suppression', contact.suppressed ? 'Suppressed' : 'Clear', contact.suppressed ? 'Excluded from outreach' : 'Eligible for review'], ['Country', contact.country, contact.source === 'manual entry' ? 'Manual entry' : 'Source workbook']].map(([label, value, meta]) => <article className={styles.stat} key={label}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div><div className={styles.statMeta}>{meta}</div></article>)}</section>
    <section className={styles.panel}><div className={styles.panelHead}><h2 className={styles.panelTitle}>Contact record</h2>{contact.website && contact.website !== '#' && <a className={styles.link} href={contact.website} target="_blank" rel="noreferrer">Open website ↗</a>}</div><table className={styles.table}><tbody><tr><th>Email</th><td><a className={styles.link} href={`mailto:${contact.email}`}>{contact.email}</a></td></tr><tr><th>Designer email</th><td>{contact.designerEmail ?? 'Not publicly listed'}</td></tr><tr><th>Studio email</th><td>{contact.studioEmail}</td></tr><tr><th>Source</th><td>{contact.source}</td></tr></tbody></table></section>
  </div>;
}
