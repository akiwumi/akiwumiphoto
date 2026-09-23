'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { addressBookCountry, campaignAudienceForCountries, campaignAudienceSelectionForVisible, type AddressBookContact } from '@/lib/outreach/address-book';
import { categoryLabel } from '@/lib/outreach/categories';
import type { OutreachContactCategory } from '@/lib/outreach/categories-server';
import { OUTREACH_DRAFT_STORAGE_KEY, type OutreachDraft } from '@/lib/outreach/draft';
import { ERASED_CONTACTS_STORAGE_KEY, MANUAL_CONTACTS_STORAGE_KEY, SENT_CONTACTS_STORAGE_KEY, sentContactMap, type SentContactRecord } from '@/lib/outreach/sent-contacts';
import { INTERIOR_DESIGNER_MAILER_SUBJECT, INTERIOR_DESIGNER_MAILER_TEXT } from '@/lib/outreach/mailer-template';
import styles from '../../Outreach.module.css';

export default function CampaignAudience({ contacts: initialContacts, categories: managedCategories, mailerHtml }: { contacts: AddressBookContact[]; categories: OutreachContactCategory[]; mailerHtml: string }) {
  const [contacts, setContacts] = useState(initialContacts);
  const [sent, setSent] = useState<Record<string, SentContactRecord>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

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

  const countries = [...new Set(contacts.map((entry) => addressBookCountry(entry.country)))].sort((left, right) => left.localeCompare(right));
  const contactCategoryNames = [...new Set(contacts.map((entry) => categoryLabel(entry.category)))];
  const categories = managedCategories
    .map((category) => categoryLabel(category.name))
    .filter((category) => contactCategoryNames.includes(category));
  if (contactCategoryNames.includes(categoryLabel(null)) && !categories.includes(categoryLabel(null))) categories.push(categoryLabel(null));
  categories.sort((left, right) => left.localeCompare(right));
  const visibleContacts = campaignAudienceForCountries(contacts, selectedCountries, selectedCategories);
  const visibleAvailable = visibleContacts.filter((entry) => !sent[entry.id]);
  const selected = contacts.filter((entry) => selectedIds.includes(entry.id) && !sent[entry.id]);
  const allVisibleAvailableSelected = visibleAvailable.length > 0 && visibleAvailable.every((entry) => selectedIds.includes(entry.id));

  function toggleAllVisibleAvailable() {
    setSelectedIds((current) => campaignAudienceSelectionForVisible(current, visibleAvailable, allVisibleAvailableSelected));
  }

  function toggleCountry(country: string) {
    setSelectedCountries((current) => current.includes(country) ? current.filter((entry) => entry !== country) : [...current, country]);
  }

  function toggleCategory(category: string) {
    setSelectedCategories((current) => current.includes(category) ? current.filter((entry) => entry !== category) : [...current, category]);
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
    <div className={styles.audienceIntro}>
      <div><p className={styles.eyebrow}>Step 1 · audience</p><h2 className={styles.panelTitle}>Select recipients</h2><p className={styles.panelMeta}>Choose available contacts for this campaign. Contacts already sent this mailer remain disabled.</p></div>
      <span className={`${styles.chip} ${styles.chipWarn}`}>{selected.length} selected</span>
    </div>
    <div className={styles.filterSection}>
      <div className={styles.sectionHeading}><div><h3>Refine your audience</h3><p>Use one or both filters to narrow the list before selecting contacts.</p></div><span className={styles.filterHint}>{visibleAvailable.length} available in view</span></div>
      <div className={styles.filterGrid}>
        <fieldset className={styles.filterCard} aria-label="Filter campaign recipients by country"><legend>Countries</legend><div className={styles.filterCardHeader}><span>{selectedCountries.length ? `${selectedCountries.length} selected` : 'All countries'}</span><button type="button" className={styles.textButton} onClick={() => setSelectedCountries([])} disabled={selectedCountries.length === 0}>Clear</button></div><div className={styles.filterOptions}>{countries.map((country) => <label key={country} className={styles.filterOption}><input className={styles.checkbox} type="checkbox" checked={selectedCountries.includes(country)} onChange={() => toggleCountry(country)} /> <span>{country}</span></label>)}</div></fieldset>
        <fieldset className={styles.filterCard} aria-label="Filter campaign recipients by category"><legend>Categories</legend><div className={styles.filterCardHeader}><span>{selectedCategories.length ? `${selectedCategories.length} selected` : 'All categories'}</span><button type="button" className={styles.textButton} onClick={() => setSelectedCategories([])} disabled={selectedCategories.length === 0}>Clear</button></div><div className={styles.filterOptions}>{categories.map((category) => <label key={category} className={styles.filterOption}><input className={styles.checkbox} type="checkbox" checked={selectedCategories.includes(category)} onChange={() => toggleCategory(category)} /> <span>{category}</span></label>)}</div></fieldset>
      </div>
      <div className={styles.filterToolbar}><button type="button" className={styles.buttonSecondary} disabled={!visibleAvailable.length} onClick={toggleAllVisibleAvailable}>{allVisibleAvailableSelected ? 'Deselect all in view' : 'Select all available in view'}</button><span className={styles.selectionCount}>{selected.length} selected overall</span></div>
    </div>
    <div className={styles.recipientSection}>
      <div className={styles.sectionHeading}><div><h3>Recipients</h3><p>Review each contact before moving to the email copy.</p></div><div className={styles.recipientStats}><span>{visibleContacts.length} in view</span><span>{Object.keys(sent).length} sent</span></div></div>
      <div className={styles.bulkList}>{visibleContacts.map((entry) => { const isSent = Boolean(sent[entry.id]); return <label key={entry.id} className={`${styles.bulkRow} ${isSent ? styles.bulkRowSent : ''}`}><input className={styles.checkbox} type="checkbox" checked={selectedIds.includes(entry.id)} disabled={isSent} onChange={() => setSelectedIds((current) => current.includes(entry.id) ? current.filter((id) => id !== entry.id) : [...current, entry.id])} /><span className={styles.bulkRowLabel}><span className={styles.bulkRowName}>{entry.name} · {entry.studio}</span><span className={styles.bulkRowEmail}>{entry.email}</span></span>{isSent ? <span className={`${styles.chip} ${styles.chipGood}`}>sent</span> : <span className={styles.chip}>available</span>}</label>; })}</div>
    </div>
    <div className={styles.bulkToolbar}><span className={styles.bulkCount}>{Object.keys(sent).length} sent · {visibleAvailable.length} available in view · {selected.length} selected overall</span><div className={styles.actions}><button type="button" className={styles.buttonSecondary} onClick={() => setSelectedIds([])}>Clear selection</button><button type="button" className={styles.buttonSecondary} onClick={resetSent}>Reset sent history</button><Link className={styles.button} href="/admin/outreach/campaigns/new/review" onClick={saveAndReview}>Review email copy <span aria-hidden="true">→</span></Link></div></div>
  </section>;
}
