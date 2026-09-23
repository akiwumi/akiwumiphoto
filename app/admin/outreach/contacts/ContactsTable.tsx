'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { filterAddressBookContacts, type AddressBookContact } from '@/lib/outreach/address-book';
import { categoryLabel } from '@/lib/outreach/categories';
import type { OutreachContactCategory } from '@/lib/outreach/categories-server';
import { applyContactOverride, CONTACT_OVERRIDES_STORAGE_KEY, contactOverrideMap } from '@/lib/outreach/contact-details';
import { ERASED_CONTACTS_STORAGE_KEY, MANUAL_CONTACTS_STORAGE_KEY, SENT_CONTACTS_STORAGE_KEY, sentContactMap, type SentContactRecord } from '@/lib/outreach/sent-contacts';
import styles from '../Outreach.module.css';

export default function ContactsTable({ contacts, categories }: { contacts: AddressBookContact[]; categories: OutreachContactCategory[] }) {
  const [sent, setSent] = useState<Record<string, SentContactRecord>>({});
  const [visibleContacts, setVisibleContacts] = useState(contacts);
  const defaultCountry = contacts.some((contact) => contact.country === 'Sweden') ? 'Sweden' : contacts[0]?.country ?? '';
  const [form, setForm] = useState({ name: '', studio: '', email: '', country: defaultCountry, website: '', role: '' });
  const [formMessage, setFormMessage] = useState('');
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('');
  const [category, setCategory] = useState('');
  const [managedCategories, setManagedCategories] = useState(categories);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [deletionMessage, setDeletionMessage] = useState('');
  const [deletionError, setDeletionError] = useState('');
  const countries = [...new Set(visibleContacts.map((contact) => contact.country))].sort((left, right) => left.localeCompare(right));

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
    const contact: AddressBookContact = { id: `manual-${Date.now()}`, country: form.country, categoryId: null, category: null, studio: form.studio.trim(), name: form.name.trim(), role: form.role.trim() || 'Manual contact', designerEmail: email, studioEmail: email, email, website: form.website.trim() || '#', source: 'manual entry', approvedForOutreach: false, outreachStatus: 'not contacted', replied: false, suppressed: false };
    const stored = JSON.parse(window.localStorage.getItem(MANUAL_CONTACTS_STORAGE_KEY) ?? '[]');
    const next = Array.isArray(stored) ? [...stored, contact] : [contact];
    window.localStorage.setItem(MANUAL_CONTACTS_STORAGE_KEY, JSON.stringify(next));
    setVisibleContacts((current) => [...current, contact]);
    setForm({ name: '', studio: '', email: '', country: defaultCountry, website: '', role: '' });
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

  function saveLocalErased(ids: string[]) {
    const stored = JSON.parse(window.localStorage.getItem(ERASED_CONTACTS_STORAGE_KEY) ?? '[]');
    const next = Array.isArray(stored) ? [...new Set([...stored, ...ids])] : ids;
    window.localStorage.setItem(ERASED_CONTACTS_STORAGE_KEY, JSON.stringify(next));
  }

  async function deleteSelected() {
    const selected = filteredContacts.filter((contact) => selectedIds.includes(contact.id));
    if (!selected.length) return;
    if (!window.confirm(`Delete exactly ${selected.length} selected contact${selected.length === 1 ? '' : 's'}?`)) return;
    setBusy(true); setDeletionMessage(''); setDeletionError('');
    try {
      const local = selected.filter((contact) => contact.id.startsWith('manual-'));
      const remoteIds = selected.filter((contact) => !contact.id.startsWith('manual-')).map((contact) => contact.id);
      let deletedIds: string[] = [];
      let protectedCount = 0;
      if (remoteIds.length) {
        const response = await fetch('/api/admin/outreach/contacts/delete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contactIds: remoteIds }) });
        const payload = await response.json() as { error?: string; deletedIds?: string[]; protectedCount?: number };
        if (!response.ok) throw new Error(payload.error || 'Unable to delete contacts.');
        deletedIds = payload.deletedIds ?? [];
        protectedCount = payload.protectedCount ?? 0;
      }
      if (local.length) saveLocalErased(local.map((contact) => contact.id));
      const removed = new Set([...deletedIds, ...local.map((contact) => contact.id)]);
      setVisibleContacts((current) => current.filter((contact) => !removed.has(contact.id)));
      setSelectedIds([]);
      setDeletionMessage(`Deleted ${removed.size} of ${selected.length} selected contact${selected.length === 1 ? '' : 's'}${protectedCount ? `; ${protectedCount} protected` : ''}.`);
    } catch (error) { setDeletionError(error instanceof Error ? error.message : 'Unable to delete contacts.'); }
    finally { setBusy(false); }
  }

  async function deleteCategory(selectedCategory: OutreachContactCategory) {
    const count = visibleContacts.filter((contact) => contact.categoryId === selectedCategory.id).length;
    const confirmation = window.prompt(`Type the exact category name to delete ${selectedCategory.name} and its ${count} contact${count === 1 ? '' : 's'}:`, '');
    if (confirmation !== selectedCategory.name) { if (confirmation !== null) setDeletionError('Category name did not match exactly.'); return; }
    setBusy(true); setDeletionMessage(''); setDeletionError('');
    try {
      const response = await fetch('/api/admin/outreach/contacts/delete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ categoryId: selectedCategory.id, categoryName: confirmation }) });
      const payload = await response.json() as { error?: string; deletedIds?: string[]; protectedIds?: string[]; categoryDeleted?: boolean };
      if (!response.ok) throw new Error(payload.error || 'Unable to delete category.');
      const removed = new Set(payload.deletedIds ?? []);
      setVisibleContacts((current) => current.filter((contact) => !removed.has(contact.id)));
      setManagedCategories((current) => current.filter((category) => category.id !== selectedCategory.id));
      setSelectedIds((current) => current.filter((id) => !removed.has(id)));
      setDeletionMessage(`Deleted category “${selectedCategory.name}” and ${removed.size} contact${removed.size === 1 ? '' : 's'}.${payload.protectedIds?.length ? ` ${payload.protectedIds.length} protected contact${payload.protectedIds.length === 1 ? '' : 's'} remain.` : ''}`);
    } catch (error) { setDeletionError(error instanceof Error ? error.message : 'Unable to delete category.'); }
    finally { setBusy(false); }
  }

  const filteredContacts = filterAddressBookContacts(visibleContacts, query, country, category);

  return <>
    <div className={styles.manualEntry}><div><h3 className={styles.panelTitle}>Add contact manually</h3><p className={styles.panelMeta}>Add one recipient without importing another spreadsheet.</p></div><form className={styles.manualForm} onSubmit={addContact}><input className={styles.input} placeholder="Name" aria-label="Contact name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><input className={styles.input} placeholder="Studio / company" aria-label="Studio or company" value={form.studio} onChange={(event) => setForm({ ...form, studio: event.target.value })} /><input className={styles.input} type="email" placeholder="Email address" aria-label="Email address" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /><select className={styles.select} aria-label="Country" value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })}>{countries.map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select><input className={styles.input} placeholder="Role (optional)" aria-label="Role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} /><input className={styles.input} type="url" placeholder="Website (optional)" aria-label="Website" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} /><button className={styles.button} type="submit">Add contact →</button></form>{formMessage && <p className={styles.success}>{formMessage}</p>}</div>
    <div className={styles.bulkToolbar}><div className={styles.filterControls}><input className={styles.input} placeholder="Search name, studio, email, country, or category" aria-label="Search address book" value={query} onChange={(event) => setQuery(event.target.value)} /><label className={styles.filterField}>Country<select className={styles.select} aria-label="Filter address book by country" value={country} onChange={(event) => setCountry(event.target.value)}><option value="">All countries</option>{countries.map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></label><label className={styles.filterField}>Category<select className={styles.select} aria-label="Filter address book by category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option><option value="Uncategorised">Uncategorised</option>{managedCategories.map((entry) => <option key={entry.id} value={entry.name}>{entry.name}</option>)}</select></label></div><span className={styles.bulkCount}>{filteredContacts.length} of {visibleContacts.length} visible · sent history protects against duplicates</span><button type="button" className={styles.smallButton} disabled={busy || !filteredContacts.length} onClick={() => setSelectedIds((current) => current.length === filteredContacts.length ? [] : filteredContacts.map((contact) => contact.id))}>{selectedIds.length === filteredContacts.length && filteredContacts.length ? 'Deselect all visible' : 'Select all visible'}</button><button type="button" className={styles.smallButtonDanger} disabled={busy || !selectedIds.length} onClick={() => void deleteSelected()}>Delete selected ({selectedIds.length})</button><button type="button" className={styles.smallButtonDanger} onClick={resetSent}>Reset sent history</button></div>
    {(deletionMessage || deletionError) && <p className={deletionError ? styles.notice : styles.success} role={deletionError ? 'alert' : 'status'}>{deletionError || deletionMessage}</p>}
    <section className={styles.categoryManager} aria-label="Manage contact categories"><div><strong>Manage categories</strong><span className={styles.panelMeta}>Deleting a category also deletes its contacts after exact-name confirmation.</span></div><div className={styles.categoryList}>{managedCategories.map((entry) => <span className={styles.categoryItem} key={entry.id}>{entry.name} · {visibleContacts.filter((contact) => contact.categoryId === entry.id).length}<button type="button" className={styles.smallButtonDanger} disabled={busy} onClick={() => void deleteCategory(entry)} aria-label={`Delete category ${entry.name}`}>Delete</button></span>)}</div></section>
    <div className={styles.tableScroll}>
    <table className={styles.table}><thead><tr><th><span className={styles.srOnly}>Select</span></th><th>Name / studio</th><th>Primary email</th><th>Country</th><th>Category</th><th>Source</th><th>Status</th></tr></thead><tbody>
      {filteredContacts.map((contact) => {
        const record = sent[contact.id];
        return <tr key={contact.id} className={record ? styles.sentRow : undefined}>
          <td><input className={styles.checkbox} type="checkbox" aria-label={`Select ${contact.name}`} checked={selectedIds.includes(contact.id)} disabled={busy} onChange={() => setSelectedIds((current) => current.includes(contact.id) ? current.filter((id) => id !== contact.id) : [...current, contact.id])} /></td><td><Link className={styles.contactLink} href={`/admin/outreach/contacts/${contact.id}`}><strong>{contact.name}</strong><br/><span>{contact.studio} · {contact.role}</span></Link></td>
          <td><a className={`${styles.link} ${record ? styles.sentEmail : ''}`} href={`mailto:${contact.email}`}>{contact.email}</a></td>
          <td>{contact.country}</td>
          <td>{categoryLabel(contact.category)}</td>
          <td>{contact.source === 'manual entry' ? <span className={`${styles.chip} ${styles.chipGood}`}>manual entry</span> : <a className={styles.link} href={contact.website} target="_blank" rel="noreferrer">Website ↗</a>}</td>
          <td><div className={styles.rowActions}>{record ? <><span className={`${styles.chip} ${styles.chipGood}`}>sent</span><small className={styles.sentAt}> {new Date(record.sentAt).toLocaleDateString()}</small></> : <span className={`${styles.chip} ${styles.chipWarn}`}>available</span>}<button type="button" className={styles.smallButtonDanger} onClick={() => eraseContact(contact)}>Erase</button></div></td>
        </tr>;
      })}
    </tbody></table>
    </div>
  </>;
}
