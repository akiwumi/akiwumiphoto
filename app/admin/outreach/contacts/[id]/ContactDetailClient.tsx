'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import type { AddressBookContact } from '@/lib/outreach/address-book';
import { applyContactOverride, CONTACT_OVERRIDES_STORAGE_KEY, contactOverrideMap, type ContactExtraField, type ContactOverride } from '@/lib/outreach/contact-details';
import { ERASED_CONTACTS_STORAGE_KEY, MANUAL_CONTACTS_STORAGE_KEY } from '@/lib/outreach/sent-contacts';
import styles from '../../Outreach.module.css';

type EditableFields = { name: string; studio: string; role: string; email: string; country: AddressBookContact['country']; website: string; phone: string; otherEmails: string; notes: string };

export default function ContactDetailClient({ id, contacts: initialContacts }: { id: string; contacts: AddressBookContact[] }) {
  const [contact, setContact] = useState<AddressBookContact>();
  const [fields, setFields] = useState<EditableFields>({ name: '', studio: '', role: '', email: '', country: 'Sweden', website: '', phone: '', otherEmails: '', notes: '' });
  const [extras, setExtras] = useState<ContactExtraField[]>([]);
  const [newExtra, setNewExtra] = useState({ label: '', value: '' });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const manual = JSON.parse(window.localStorage.getItem(MANUAL_CONTACTS_STORAGE_KEY) ?? '[]');
        const all = Array.isArray(manual) ? [...initialContacts, ...manual] : initialContacts;
        const erased = JSON.parse(window.localStorage.getItem(ERASED_CONTACTS_STORAGE_KEY) ?? '[]');
        const overrides = contactOverrideMap(JSON.parse(window.localStorage.getItem(CONTACT_OVERRIDES_STORAGE_KEY) ?? '[]'));
        const base = all.find((candidate) => candidate.id === id);
        const override = overrides[id];
        if (Array.isArray(erased) && erased.includes(id)) setContact(undefined);
        else if (base) {
          const edited = applyContactOverride(base, override);
          setContact(edited);
          setFields({ name: edited.name, studio: edited.studio, role: edited.role, email: edited.email, country: edited.country, website: edited.website === '#' ? '' : edited.website, phone: override?.phone ?? '', otherEmails: (override?.otherEmails ?? []).join(', '), notes: override?.notes ?? '' });
          setExtras(override?.extras ?? []);
        }
      } catch { setContact(initialContacts.find((candidate) => candidate.id === id)); }
      finally { setLoading(false); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [id, initialContacts]);

  function updateField<K extends keyof EditableFields>(key: K, value: EditableFields[K]) { setFields((current) => ({ ...current, [key]: value })); }

  function addExtra(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newExtra.label.trim() || !newExtra.value.trim()) return;
    setExtras((current) => [...current, { id: `extra-${Date.now()}`, label: newExtra.label.trim(), value: newExtra.value.trim() }]);
    setNewExtra({ label: '', value: '' });
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contact || !fields.name.trim() || !fields.studio.trim() || !fields.email.trim()) { setMessage('Name, studio, and email are required.'); return; }
    const stored = contactOverrideMap(JSON.parse(window.localStorage.getItem(CONTACT_OVERRIDES_STORAGE_KEY) ?? '[]'));
    const override: ContactOverride = { contactId: id, name: fields.name, studio: fields.studio, role: fields.role, email: fields.email.trim().toLowerCase(), country: fields.country, website: fields.website, phone: fields.phone, otherEmails: fields.otherEmails.split(',').map((email) => email.trim().toLowerCase()).filter(Boolean), notes: fields.notes, extras };
    stored[id] = override;
    window.localStorage.setItem(CONTACT_OVERRIDES_STORAGE_KEY, JSON.stringify(Object.values(stored)));
    setContact(applyContactOverride(contact, override));
    setMessage('Contact details saved locally.');
  }

  if (loading) return <div className={styles.page}><p className={styles.notice}>Loading contact record…</p></div>;
  if (!contact) return <div className={styles.page}><h1 className={styles.title}>Contact not found</h1><Link className={styles.link} href="/admin/outreach/contacts">Back to address book</Link></div>;
  return <div className={styles.page}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Contact detail · {contact.country}</p><h1 className={styles.title}>{contact.name}</h1><p className={styles.subtitle}>{contact.studio} · {contact.role} · {contact.email}</p></div><Link className={styles.buttonSecondary} href="/admin/outreach/contacts">Back to address book</Link></header>
    <section className={styles.panel}><div className={styles.panelHead}><div><h2 className={styles.panelTitle}>Edit contact details</h2><p className={styles.panelMeta}>Changes are saved locally and used by the address book and campaigns.</p></div></div><form className={styles.formGrid} onSubmit={save}><div className={styles.field}><label htmlFor="contact-name">Name</label><input id="contact-name" className={styles.input} value={fields.name} onChange={(event) => updateField('name', event.target.value)} /></div><div className={styles.field}><label htmlFor="contact-studio">Studio / company</label><input id="contact-studio" className={styles.input} value={fields.studio} onChange={(event) => updateField('studio', event.target.value)} /></div><div className={styles.field}><label htmlFor="contact-role">Role</label><input id="contact-role" className={styles.input} value={fields.role} onChange={(event) => updateField('role', event.target.value)} /></div><div className={styles.field}><label htmlFor="contact-email">Primary email</label><input id="contact-email" type="email" className={styles.input} value={fields.email} onChange={(event) => updateField('email', event.target.value)} /></div><div className={styles.field}><label htmlFor="contact-phone">Phone number</label><input id="contact-phone" type="tel" className={styles.input} value={fields.phone} onChange={(event) => updateField('phone', event.target.value)} /></div><div className={styles.field}><label htmlFor="contact-country">Country</label><select id="contact-country" className={styles.select} value={fields.country} onChange={(event) => updateField('country', event.target.value as AddressBookContact['country'])}><option>Sweden</option><option>Denmark</option><option>Norway</option></select></div><div className={`${styles.field} ${styles.fieldFull}`}><label htmlFor="contact-other-emails">Other email addresses</label><input id="contact-other-emails" className={styles.input} placeholder="assistant@example.com, studio@example.com" value={fields.otherEmails} onChange={(event) => updateField('otherEmails', event.target.value)} /><span className={styles.editorHint}>Separate multiple addresses with commas.</span></div><div className={`${styles.field} ${styles.fieldFull}`}><label htmlFor="contact-website">Website</label><input id="contact-website" type="url" className={styles.input} value={fields.website} onChange={(event) => updateField('website', event.target.value)} /></div><div className={`${styles.field} ${styles.fieldFull}`}><label htmlFor="contact-notes">Notes</label><textarea id="contact-notes" className={styles.textarea} placeholder="Add context, preferences, follow-up notes, or relationship history" value={fields.notes} onChange={(event) => updateField('notes', event.target.value)} /></div><div className={`${styles.field} ${styles.fieldFull}`}><div className={styles.actions}><button className={styles.button} type="submit">Save contact details →</button></div>{message && <p className={styles.success}>{message}</p>}</div></form></section>
    <section className={styles.panel}><div className={styles.panelHead}><div><h2 className={styles.panelTitle}>Additional contact categories</h2><p className={styles.panelMeta}>Add any other contact information you want to keep with this record.</p></div></div><div className={styles.formGrid}>{extras.length > 0 && <div className={`${styles.field} ${styles.fieldFull}`}><table className={styles.table}><tbody>{extras.map((extra) => <tr key={extra.id}><th>{extra.label}</th><td>{extra.value}</td><td><button type="button" className={styles.smallButtonDanger} onClick={() => setExtras((current) => current.filter((entry) => entry.id !== extra.id))}>Remove</button></td></tr>)}</tbody></table></div>}<form className={`${styles.field} ${styles.fieldFull}`} onSubmit={addExtra}><label htmlFor="extra-label">Add category</label><div className={styles.actions}><input id="extra-label" className={styles.input} placeholder="Category, e.g. Assistant or LinkedIn" value={newExtra.label} onChange={(event) => setNewExtra({ ...newExtra, label: event.target.value })} /><input className={styles.input} placeholder="Value" aria-label="Category value" value={newExtra.value} onChange={(event) => setNewExtra({ ...newExtra, value: event.target.value })} /><button type="submit" className={styles.buttonSecondary}>Add category</button></div><span className={styles.editorHint}>Save contact details after adding categories.</span></form></div></section>
    <section className={styles.grid}>{[['Approval', contact.approvedForOutreach ? 'Approved' : 'Needs review', 'Manual approval required'], ['Reply', contact.replied ? 'Yes' : 'No', 'Manual status'], ['Suppression', contact.suppressed ? 'Suppressed' : 'Clear', contact.suppressed ? 'Excluded from outreach' : 'Eligible for review'], ['Country', contact.country, contact.source === 'manual entry' ? 'Manual entry' : 'Source workbook']].map(([label, value, meta]) => <article className={styles.stat} key={label}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div><div className={styles.statMeta}>{meta}</div></article>)}</section>
    <section className={styles.panel}><div className={styles.panelHead}><h2 className={styles.panelTitle}>Contact record</h2>{contact.website && contact.website !== '#' && <a className={styles.link} href={contact.website} target="_blank" rel="noreferrer">Open website ↗</a>}</div><table className={styles.table}><tbody><tr><th>Email</th><td><a className={styles.link} href={`mailto:${contact.email}`}>{contact.email}</a></td></tr><tr><th>Designer email</th><td>{contact.designerEmail ?? 'Not publicly listed'}</td></tr><tr><th>Studio email</th><td>{contact.studioEmail}</td></tr><tr><th>Phone</th><td>{fields.phone || 'Not added'}</td></tr><tr><th>Other emails</th><td>{fields.otherEmails || 'Not added'}</td></tr><tr><th>Notes</th><td>{fields.notes || 'No notes added'}</td></tr><tr><th>Source</th><td>{contact.source}</td></tr></tbody></table></section>
  </div>;
}
