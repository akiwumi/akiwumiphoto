'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { renderMessage, imageWarnings } from '@/lib/outreach/render';
import { INTERIOR_DESIGNER_MAILER_SUBJECT, INTERIOR_DESIGNER_MAILER_TEXT } from '@/lib/outreach/mailer-template';
import type { AddressBookContact } from '@/lib/outreach/address-book';
import { OUTREACH_DRAFT_STORAGE_KEY, type OutreachDraft } from '@/lib/outreach/draft';
import { ERASED_CONTACTS_STORAGE_KEY, MANUAL_CONTACTS_STORAGE_KEY } from '@/lib/outreach/sent-contacts';
import styles from '../../Outreach.module.css';

function firstName(name: string): string { if (/founding design team/i.test(name)) return 'Studio Force Majeure team'; if (name.includes('&')) return name.split('&')[0].trim(); return name.split(/\s+/)[0] ?? name; }
function mergeData(contact: AddressBookContact) { return { first_name: firstName(contact.name), company_name: contact.studio, website: contact.website, city: contact.country === 'Sweden' ? 'Stockholm' : null }; }

export default function CampaignComposer({ contacts: initialContacts, mailerHtml, resendActive }: { contacts: AddressBookContact[]; mailerHtml: string; resendActive: boolean }) {
  const [contacts, setContacts] = useState(initialContacts);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [contactId, setContactId] = useState(initialContacts[0]?.id ?? '');
  const [subject, setSubject] = useState(INTERIOR_DESIGNER_MAILER_SUBJECT);
  const [htmlCopy, setHtmlCopy] = useState(mailerHtml);
  const [textCopy, setTextCopy] = useState(INTERIOR_DESIGNER_MAILER_TEXT);
  const [saved, setSaved] = useState('');
  const [testRecipient, setTestRecipient] = useState('');
  const [testStatus, setTestStatus] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const contact = contacts.find((entry) => entry.id === contactId) ?? contacts[0];
  const rendered = useMemo(() => contact ? renderMessage({ html: htmlCopy, text: textCopy, subject, data: mergeData(contact) }) : null, [contact, htmlCopy, subject, textCopy]);
  const warnings = rendered ? imageWarnings(rendered.html) : [];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const manual = JSON.parse(window.localStorage.getItem(MANUAL_CONTACTS_STORAGE_KEY) ?? '[]');
        const all = Array.isArray(manual) ? [...initialContacts, ...manual] : initialContacts;
        const erased = JSON.parse(window.localStorage.getItem(ERASED_CONTACTS_STORAGE_KEY) ?? '[]');
        setContacts(Array.isArray(erased) ? all.filter((entry) => !erased.includes(entry.id)) : all);
        const draft = JSON.parse(window.localStorage.getItem(OUTREACH_DRAFT_STORAGE_KEY) ?? 'null') as Partial<OutreachDraft> | null;
        if (draft) { if (Array.isArray(draft.selectedIds)) setSelectedIds(draft.selectedIds); if (draft.subject) setSubject(draft.subject); if (draft.html) setHtmlCopy(draft.html); if (draft.text) setTextCopy(draft.text); }
      } catch { setContacts(initialContacts); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialContacts]);

  function saveDraft() {
    const draft: OutreachDraft = { selectedIds, subject, html: htmlCopy, text: textCopy };
    window.localStorage.setItem(OUTREACH_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    setSaved('Draft saved locally. Continue to the final preview when ready.');
  }

  async function sendTest() {
    if (!testRecipient || !rendered) return;
    setSendingTest(true); setTestStatus('');
    const response = await fetch('/api/admin/outreach/test-send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ to: testRecipient, subject: rendered.subject, html: rendered.html, text: rendered.text }) });
    const result = await response.json();
    setTestStatus(response.ok ? `Test sent via ${result.provider}. Message ID: ${result.providerMessageId}` : result.error ?? 'Test send failed.');
    setSendingTest(false);
  }

  if (!contact || !rendered) return <p className={styles.notice}>No contacts are available for preview. <Link className={styles.link} href="/admin/outreach/contacts">Add a contact →</Link></p>;
  return <>
    <section className={styles.panel}><div className={styles.panelHead}><div><h2 className={styles.panelTitle}>Review and edit email copy</h2><p className={styles.panelMeta}>Step 2 · edit once, then personalize for each selected recipient.</p></div><span className={`${styles.chip} ${styles.chipWarn}`}>Step 2 · copy</span></div><div className={styles.formGrid}><div className={styles.field}><label htmlFor="campaign-subject">Subject</label><input id="campaign-subject" className={styles.input} value={subject} onChange={(event) => setSubject(event.target.value)} /></div><div className={styles.field}><label htmlFor="preview-contact">Preview recipient</label><select id="preview-contact" className={styles.select} value={contact.id} onChange={(event) => setContactId(event.target.value)}>{contacts.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.studio} · {entry.email}</option>)}</select></div><div className={styles.field}><label htmlFor="campaign-text">Plain-text copy</label><textarea id="campaign-text" className={styles.textarea} value={textCopy} onChange={(event) => setTextCopy(event.target.value)} /><span className={styles.editorHint}>Plain-text fallback sent alongside the HTML version.</span></div><div className={styles.field}><label htmlFor="campaign-html">HTML copy</label><textarea id="campaign-html" className={styles.textarea} value={htmlCopy} onChange={(event) => setHtmlCopy(event.target.value)} /><span className={styles.editorHint}>Keep merge fields in double braces.</span></div></div></section>
    <section className={styles.panel}><div className={styles.panelHead}><div><h2 className={styles.panelTitle}>Personalized preview</h2><p className={styles.panelMeta}>Previewing {contact.email} · {selectedIds.length} recipients selected</p></div></div><div className={styles.formGrid}><div className={`${styles.field} ${styles.fieldFull}`}><div className={styles.previewMeta}><span>To: {contact.email}</span><span>Greeting: Hello {firstName(contact.name)},</span><span>Subject: {rendered.subject}</span></div><iframe className={styles.mailerPreview} title={`Personalized mailer for ${contact.name}`} srcDoc={rendered.html} /></div>{warnings.length > 0 && <div className={`${styles.field} ${styles.fieldFull}`}><div className={styles.notice}>The preview is using fresh gallery image URLs. Before a large production send, replace expiring image links with permanent public URLs or inline attachments.</div></div>}<div className={`${styles.field} ${styles.fieldFull}`}><div className={styles.actions}><button type="button" className={styles.buttonSecondary} onClick={saveDraft}>Save draft</button><Link className={styles.button} href="/admin/outreach/campaigns/new/final" onClick={saveDraft}>Final preview →</Link><Link className={styles.buttonSecondary} href="/admin/outreach/campaigns/new">Change recipients</Link></div>{saved && <p className={styles.success}>{saved}</p>}</div></div></section>
    <section className={styles.panel}><div className={styles.panelHead}><div><h2 className={styles.panelTitle}>Test before sending</h2><p className={styles.panelMeta}>This sends only the previewed message to you and does not change recipient status.</p></div></div><div className={styles.actions}><input className={styles.input} type="email" value={testRecipient} onChange={(event) => setTestRecipient(event.target.value)} placeholder="your email address" aria-label="Test recipient email" /><button type="button" className={styles.button} disabled={!resendActive || sendingTest || !testRecipient} onClick={sendTest}>{sendingTest ? 'Sending…' : 'Send test to me'}</button></div>{!resendActive && <p className={styles.notice}>Set OUTREACH_EMAIL_PROVIDER=resend and restart the server to enable live test sending.</p>}{testStatus && <p className={styles.success}>{testStatus}</p>}</section>
  </>;
}
