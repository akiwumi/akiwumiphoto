'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { campaignAudienceForCountry, type AddressBookContact } from '@/lib/outreach/address-book';
import { OUTREACH_DRAFT_STORAGE_KEY, type OutreachDraft } from '@/lib/outreach/draft';
import { ERASED_CONTACTS_STORAGE_KEY, MANUAL_CONTACTS_STORAGE_KEY, SENT_CONTACTS_STORAGE_KEY, sentContactMap, type SentContactRecord } from '@/lib/outreach/sent-contacts';
import { INTERIOR_DESIGNER_MAILER_SUBJECT, INTERIOR_DESIGNER_MAILER_TEXT } from '@/lib/outreach/mailer-template';
import styles from '../../Outreach.module.css';

export default function CampaignAudience({ contacts: initialContacts, mailerHtml }: { contacts: AddressBookContact[]; mailerHtml: string }) {
  const [contacts, setContacts] = useState(initialContacts);
  const [sent, setSent] = useState<Record<string, SentContactRecord>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [country, setCountry] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const manual = JSON.parse(window.localStorage.getItem(MANUAL_CONTACTS_STORAGE_KEY) ?? '[]');
        const all = Array.isArray(manual) ? [...initialContacts, ...manual] : initialContacts;
        const erased = JSON.parse(window.localStorage.getItem(ERASED_CONTACTS_STORAGE_KEY) ?? '[]');
        setContacts(Array.isArray(erased) ? all.filter((entry) => !erased.includes(entry.id)) : all);
        const storedSent = JSON.parse(window.localStorage.getItem(SENT_CONTACTS_STORAGE_KEY) ?? '[]');
        if (Array.isArray(storedSent)) setSent(sentContactMap(storedSent));
        const draft = JSON.parse(window.localStorage.getItem(OUTREACH_DRAFT_STORAGE_KEY) ?? 'null');
        if (draft?.selectedIds && Array.isArray(draft.selectedIds)) setSelectedIds(draft.selectedIds);
      } catch { setContacts(initialContacts); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialContacts]);

  const countries = [...new Set(contacts.map((entry) => entry.country))].sort((left, right) => left.localeCompare(right));
  const visibleContacts = campaignAudienceForCountry(contacts, country);
  const visibleAvailable = visibleContacts.filter((entry) => !sent[entry.id]);
  const selected = contacts.filter((entry) => selectedIds.includes(entry.id) && !sent[entry.id]);
  const allVisibleAvailableSelected = visibleAvailable.length > 0 && visibleAvailable.every((entry) => selectedIds.includes(entry.id));

  function toggleAllVisibleAvailable() {
    const availableIds = new Set(visibleAvailable.map((entry) => entry.id));
    setSelectedIds((current) => allVisibleAvailableSelected
      ? current.filter((id) => !availableIds.has(id))
      : [...current.filter((id) => !availableIds.has(id)), ...visibleAvailable.map((entry) => entry.id)]);
  }

  function saveAndReview() {
    const current = JSON.parse(window.localStorage.getItem(OUTREACH_DRAFT_STORAGE_KEY) ?? 'null') as Partial<OutreachDraft> | null;
    const draft: OutreachDraft = { campaignId: current?.campaignId ?? crypto.randomUUID(), selectedIds: selected.map((entry) => entry.id), subject: current?.subject ?? INTERIOR_DESIGNER_MAILER_SUBJECT, html: current?.html ?? mailerHtml, text: current?.text ?? INTERIOR_DESIGNER_MAILER_TEXT };
    window.localStorage.setItem(OUTREACH_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }

  function resetSent() {
    if (!window.confirm('Reset sent history for every contact? This will allow those addresses to be selected again.')) return;
    window.localStorage.removeItem(SENT_CONTACTS_STORAGE_KEY);
    setSent({});
  }

  return <section className={styles.panel}>
    <div className={styles.panelHead}><div><h2 className={styles.panelTitle}>Select recipients</h2><p className={styles.panelMeta}>Choose the available contacts for this campaign. Sent contacts remain disabled.</p></div><div className={styles.selectionControls}><label className={styles.filterField}>Country<select className={styles.select} aria-label="Filter campaign recipients by country" value={country} onChange={(event) => setCountry(event.target.value)}><option value="">All countries</option>{countries.map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></label><button type="button" className={styles.buttonSecondary} disabled={!visibleAvailable.length} onClick={toggleAllVisibleAvailable}>{allVisibleAvailableSelected ? 'Deselect all' : 'Select all available'}</button><span className={styles.selectionCount}>{selected.length} selected · {visibleAvailable.length} available in view</span><span className={`${styles.chip} ${styles.chipWarn}`}>Step 1 · recipients</span></div></div>
    <div className={styles.bulkList}>{visibleContacts.map((entry) => { const isSent = Boolean(sent[entry.id]); return <label key={entry.id} className={`${styles.bulkRow} ${isSent ? styles.bulkRowSent : ''}`}><input className={styles.checkbox} type="checkbox" checked={selectedIds.includes(entry.id)} disabled={isSent} onChange={() => setSelectedIds((current) => current.includes(entry.id) ? current.filter((id) => id !== entry.id) : [...current, entry.id])} /><span className={styles.bulkRowLabel}><span className={styles.bulkRowName}>{entry.name} · {entry.studio}</span><span className={styles.bulkRowEmail}>{entry.email}</span></span>{isSent ? <span className={`${styles.chip} ${styles.chipGood}`}>sent</span> : <span className={styles.chip}>available</span>}</label>; })}</div>
    <div className={styles.bulkToolbar}><span className={styles.bulkCount}>{Object.keys(sent).length} sent · {visibleAvailable.length} available in view · {selected.length} selected overall</span><div className={styles.actions}><button type="button" className={styles.buttonSecondary} onClick={() => setSelectedIds([])}>Clear</button><button type="button" className={styles.buttonSecondary} onClick={resetSent}>Reset sent history</button><Link className={styles.button} href="/admin/outreach/campaigns/new/review" onClick={saveAndReview}>Review email copy →</Link></div></div>
  </section>;
}
