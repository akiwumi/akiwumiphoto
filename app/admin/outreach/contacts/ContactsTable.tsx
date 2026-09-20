'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import type { AddressBookContact } from '@/lib/outreach/address-book';
import { applyContactOverride, CONTACT_OVERRIDES_STORAGE_KEY, contactOverrideMap } from '@/lib/outreach/contact-details';
import { ERASED_CONTACTS_STORAGE_KEY, MANUAL_CONTACTS_STORAGE_KEY, SENT_CONTACTS_STORAGE_KEY, sentContactMap, type SentContactRecord } from '@/lib/outreach/sent-contacts';
import styles from '../Outreach.module.css';

export default function ContactsTable({ contacts }: { contacts: AddressBookContact[] }) {
  const [sent, setSent] = useState<Record<string, SentContactRecord>>({});
  const [visibleContacts, setVisibleContacts] = useState(contacts);
  const [form, setForm] = useState({ name: '', studio: '', email: '', country: 'Sweden' as AddressBookContact['country'], website: '', role: '' });
  const [formMessage, setFormMessage] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const manual = JSON.parse(window.localStorage.getItem(MANUAL_CONTACTS_STORAGE_KEY) ?? '[]');
        const allContacts = Array.isArray(manual) ? [...contacts, ...manual] : contacts;
        const overrides = contactOverrideMap(JSON.parse(window.localStorage.getItem(CONTACT_OVERRIDES_STORAGE_KEY) ?? '[]'));
        const editedContacts = allContacts.map((contact) => applyContactOverride(contact, overrides[contact.id]));
        const parsed = JSON.parse(window.localStorage.getItem(SENT_CONTACTS_STORAGE_KEY) ?? '[]');
        if (Array.isArray(parsed)) setSent(sentContactMap(parsed));
        const erased = JSON.parse(window.localStorage.getItem(ERASED_CONTACTS_STORAGE_KEY) ?? '[]');
        if (Array.isArray(erased)) setVisibleContacts(editedContacts.filter((contact) => !erased.includes(contact.id)));
      } catch {
        setSent({});
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [contacts]);

  function addContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = form.email.trim().toLowerCase();
    if (!form.name.trim() || !form.studio.trim() || !email) { setFormMessage('Name, studio, and email are required.'); return; }
    if (visibleContacts.some((contact) => contact.email.toLowerCase() === email)) { setFormMessage('That email address is already in the address book.'); return; }
    const contact: AddressBookContact = { id: `manual-${Date.now()}`, country: form.country, studio: form.studio.trim(), name: form.name.trim(), role: form.role.trim() || 'Manual contact', designerEmail: email, studioEmail: email, email, website: form.website.trim() || '#', source: 'manual entry', approvedForOutreach: false, outreachStatus: 'not contacted', replied: false, suppressed: false };
    const stored = JSON.parse(window.localStorage.getItem(MANUAL_CONTACTS_STORAGE_KEY) ?? '[]');
    const next = Array.isArray(stored) ? [...stored, contact] : [contact];
    window.localStorage.setItem(MANUAL_CONTACTS_STORAGE_KEY, JSON.stringify(next));
    setVisibleContacts((current) => [...current, contact]);
    setForm({ name: '', studio: '', email: '', country: 'Sweden', website: '', role: '' });
    setFormMessage(`${contact.email} added to the address book.`);
  }

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

  const normalizedQuery = query.trim().toLowerCase();
  const filteredContacts = visibleContacts.filter((contact) => !normalizedQuery || [contact.name, contact.studio, contact.email, contact.country].some((value) => value.toLowerCase().includes(normalizedQuery)));

  return <>
    <div className={styles.manualEntry}><div><h3 className={styles.panelTitle}>Add contact manually</h3><p className={styles.panelMeta}>Add one recipient without importing another spreadsheet.</p></div><form className={styles.manualForm} onSubmit={addContact}><input className={styles.input} placeholder="Name" aria-label="Contact name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><input className={styles.input} placeholder="Studio / company" aria-label="Studio or company" value={form.studio} onChange={(event) => setForm({ ...form, studio: event.target.value })} /><input className={styles.input} type="email" placeholder="Email address" aria-label="Email address" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /><select className={styles.select} aria-label="Country" value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value as AddressBookContact['country'] })}><option>Sweden</option><option>Denmark</option><option>Norway</option></select><input className={styles.input} placeholder="Role (optional)" aria-label="Role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} /><input className={styles.input} type="url" placeholder="Website (optional)" aria-label="Website" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} /><button className={styles.button} type="submit">Add contact →</button></form>{formMessage && <p className={styles.success}>{formMessage}</p>}</div>
    <div className={styles.bulkToolbar}><input className={styles.input} placeholder="Search name, studio, email, or country" aria-label="Search address book" value={query} onChange={(event) => setQuery(event.target.value)} /><span className={styles.bulkCount}>{filteredContacts.length} of {visibleContacts.length} visible · sent history protects against duplicates</span><button type="button" className={styles.smallButtonDanger} onClick={resetSent}>Reset sent history</button></div>
    <div className={styles.tableScroll}>
    <table className={styles.table}><thead><tr><th>Name / studio</th><th>Primary email</th><th>Country</th><th>Source</th><th>Status</th></tr></thead><tbody>
      {filteredContacts.map((contact) => {
        const record = sent[contact.id];
        return <tr key={contact.id} className={record ? styles.sentRow : undefined}>
          <td><Link className={styles.contactLink} href={`/admin/outreach/contacts/${contact.id}`}><strong>{contact.name}</strong><br/><span>{contact.studio} · {contact.role}</span></Link></td>
          <td><a className={`${styles.link} ${record ? styles.sentEmail : ''}`} href={`mailto:${contact.email}`}>{contact.email}</a></td>
          <td>{contact.country}</td>
          <td>{contact.source === 'manual entry' ? <span className={`${styles.chip} ${styles.chipGood}`}>manual entry</span> : <a className={styles.link} href={contact.website} target="_blank" rel="noreferrer">Website ↗</a>}</td>
          <td><div className={styles.rowActions}>{record ? <><span className={`${styles.chip} ${styles.chipGood}`}>sent</span><small className={styles.sentAt}> {new Date(record.sentAt).toLocaleDateString()}</small></> : <span className={`${styles.chip} ${styles.chipWarn}`}>available</span>}<button type="button" className={styles.smallButtonDanger} onClick={() => eraseContact(contact)}>Erase</button></div></td>
        </tr>;
      })}
    </tbody></table>
    </div>
  </>;
}
