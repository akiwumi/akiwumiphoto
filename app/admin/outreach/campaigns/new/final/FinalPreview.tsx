'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { AddressBookContact } from '@/lib/outreach/address-book';
import { OUTREACH_DRAFT_STORAGE_KEY, type OutreachDraft } from '@/lib/outreach/draft';
import { ERASED_CONTACTS_STORAGE_KEY, MANUAL_CONTACTS_STORAGE_KEY, SENT_CONTACTS_STORAGE_KEY, sentContactMap, type SentContactRecord } from '@/lib/outreach/sent-contacts';
import { renderMessage } from '@/lib/outreach/render';
import styles from '../../../Outreach.module.css';

function firstName(name: string): string { if (/founding design team/i.test(name)) return 'Studio Force Majeure team'; if (name.includes('&')) return name.split('&')[0].trim(); return name.split(/\s+/)[0] ?? name; }
function mergeData(contact: AddressBookContact) { return { first_name: firstName(contact.name), company_name: contact.studio, website: contact.website, city: contact.country === 'Sweden' ? 'Stockholm' : null }; }

export default function FinalPreview({ initialContacts, resendActive }: { initialContacts: AddressBookContact[]; resendActive: boolean }) {
  const [contacts, setContacts] = useState(initialContacts);
  const [sent, setSent] = useState<Record<string, SentContactRecord>>({});
  const [draft, setDraft] = useState<OutreachDraft | null>(null);
  const [previewId, setPreviewId] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [testStatus, setTestStatus] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const manual = JSON.parse(window.localStorage.getItem(MANUAL_CONTACTS_STORAGE_KEY) ?? '[]');
        const all = Array.isArray(manual) ? [...initialContacts, ...manual] : initialContacts;
        const erased = JSON.parse(window.localStorage.getItem(ERASED_CONTACTS_STORAGE_KEY) ?? '[]');
        const visible = Array.isArray(erased) ? all.filter((entry) => !erased.includes(entry.id)) : all;
        setContacts(visible);
        const storedSent = JSON.parse(window.localStorage.getItem(SENT_CONTACTS_STORAGE_KEY) ?? '[]');
        if (Array.isArray(storedSent)) setSent(sentContactMap(storedSent));
        const storedDraft = JSON.parse(window.localStorage.getItem(OUTREACH_DRAFT_STORAGE_KEY) ?? 'null');
        if (storedDraft?.selectedIds && Array.isArray(storedDraft.selectedIds)) { setDraft(storedDraft); setPreviewId(storedDraft.selectedIds[0] ?? ''); }
      } catch { setDraft(null); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialContacts]);

  const selected = draft ? contacts.filter((entry) => draft.selectedIds.includes(entry.id) && !sent[entry.id]) : [];
  const previewContact = selected.find((entry) => entry.id === previewId) ?? selected[0];
  const preview = draft && previewContact ? renderMessage({ html: draft.html, text: draft.text, subject: draft.subject, data: mergeData(previewContact) }) : null;

  async function sendAll() {
    if (!draft || selected.length === 0) return;
    if (!window.confirm(`Record personalized sends for ${selected.length} recipients? This is the final confirmation.`)) return;
    setSending(true); setMessage(''); let completed = 0;
    try {
      for (const contact of selected) {
        const rendered = renderMessage({ html: draft.html, text: draft.text, subject: draft.subject, data: mergeData(contact) });
        const response = await fetch('/api/admin/outreach/campaigns/local/send-test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ to: contact.email, from: 'hello@akiwumiphoto.com', replyTo: 'hello@akiwumiphoto.com', subject: rendered.subject, html: rendered.html, text: rendered.text }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? 'Unable to record send');
        const record = { contactId: contact.id, email: contact.email, sentAt: new Date().toISOString(), providerMessageId: result.providerMessageId, subject: rendered.subject, html: rendered.html, text: rendered.text };
        setSent((current) => { const next = { ...current, [contact.id]: record }; window.localStorage.setItem(SENT_CONTACTS_STORAGE_KEY, JSON.stringify(Object.values(next))); return next; });
        completed += 1;
      }
      window.localStorage.removeItem(OUTREACH_DRAFT_STORAGE_KEY);
      setMessage(`Recorded ${completed} personalized local mock sends. No external email was sent.`);
    } catch (error) { setMessage(`${completed} recorded. ${error instanceof Error ? error.message : 'Unable to complete send.'}`); }
    finally { setSending(false); }
  }

  async function sendTest() {
    if (!testRecipient || !preview) return;
    setSendingTest(true); setTestStatus('');
    const response = await fetch('/api/admin/outreach/test-send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ to: testRecipient, subject: preview.subject, html: preview.html, text: preview.text }) });
    const result = await response.json();
    setTestStatus(response.ok ? `Test sent via ${result.provider}. Message ID: ${result.providerMessageId}` : result.error ?? 'Test send failed.');
    setSendingTest(false);
  }

  if (!draft) return <section className={styles.panel}><div className={styles.emptyState}>No campaign draft is ready. <Link className={styles.link} href="/admin/outreach/campaigns/new">Choose recipients →</Link></div></section>;
  if (selected.length === 0) return <section className={styles.panel}><div className={styles.emptyState}>All selected contacts have already been sent or are unavailable. <Link className={styles.link} href="/admin/outreach/campaigns/new">Choose recipients →</Link></div></section>;
  return <><section className={styles.panel}><div className={styles.panelHead}><div><h2 className={styles.panelTitle}>Final preview</h2><p className={styles.panelMeta}>Step 3 · confirm the exact personalized email before any contact send.</p></div><span className={`${styles.chip} ${styles.chipWarn}`}>Step 3 · final check</span></div><div className={styles.bulkList}>{selected.map((contact) => <div className={styles.bulkRow} key={contact.id}><span className={styles.bulkRowLabel}><span className={styles.bulkRowName}>{contact.name} · {contact.studio}</span><span className={styles.bulkRowEmail}>{contact.email}</span></span><span className={styles.chip}>ready</span></div>)}</div><div className={styles.bulkToolbar}><span className={styles.bulkCount}>{selected.length} personalized emails ready</span><div className={styles.actions}><Link className={styles.buttonSecondary} href="/admin/outreach/campaigns/new/review">Back to edit</Link><button type="button" className={styles.button} disabled={sending} onClick={sendAll}>{sending ? 'Recording…' : `Confirm and send ${selected.length} email${selected.length === 1 ? '' : 's'} →`}</button></div></div></section><section className={styles.panel}><div className={styles.panelHead}><div><h2 className={styles.panelTitle}>Personalized final preview</h2><p className={styles.panelMeta}>This is the exact rendered version for the selected recipient.</p></div><select className={styles.select} aria-label="Final preview recipient" value={previewContact.id} onChange={(event) => setPreviewId(event.target.value)}>{selected.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.email}</option>)}</select></div><div className={styles.formGrid}><div className={`${styles.field} ${styles.fieldFull}`}><div className={styles.previewMeta}><span>To: {previewContact.email}</span><span>Subject: {preview?.subject}</span><span>Greeting: Hello {firstName(previewContact.name)},</span></div><iframe className={styles.mailerPreview} title={`Final personalized mailer for ${previewContact.name}`} srcDoc={preview?.html ?? ''} /></div><div className={`${styles.field} ${styles.fieldFull}`}><div className={styles.actions}><input className={styles.input} type="email" value={testRecipient} onChange={(event) => setTestRecipient(event.target.value)} placeholder="your email address" aria-label="Test recipient email" /><button type="button" className={styles.button} disabled={!resendActive || sendingTest || !testRecipient} onClick={sendTest}>{sendingTest ? 'Sending…' : 'Send test to me'}</button></div>{!resendActive && <p className={styles.notice}>Set OUTREACH_EMAIL_PROVIDER=resend and restart the server to enable live test sending.</p>}{testStatus && <p className={styles.success}>{testStatus}</p>}{message && <p className={styles.success}>{message}</p>}</div></div></section></>;
}
