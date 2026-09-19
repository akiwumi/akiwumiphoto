'use client';

import { useEffect, useMemo, useState } from 'react';
import { renderMessage, imageWarnings } from '@/lib/outreach/render';
import { INTERIOR_DESIGNER_MAILER_SUBJECT, INTERIOR_DESIGNER_MAILER_TEXT } from '@/lib/outreach/mailer-template';
import type { AddressBookContact } from '@/lib/outreach/address-book';
import { ERASED_CONTACTS_STORAGE_KEY, SENT_CONTACTS_STORAGE_KEY, sentContactMap, type SentContactRecord } from '@/lib/outreach/sent-contacts';
import styles from '../../Outreach.module.css';

function firstName(name: string): string {
  if (/founding design team/i.test(name)) return 'Studio Force Majeure team';
  if (name.includes('&')) return name.split('&')[0].trim();
  return name.split(/\s+/)[0] ?? name;
}

function mergeData(contact: AddressBookContact) {
  return { first_name: firstName(contact.name), company_name: contact.studio, website: contact.website, city: contact.country === 'Sweden' ? 'Stockholm' : null };
}

export default function CampaignComposer({ contacts: initialContacts, mailerHtml }: { contacts: AddressBookContact[]; mailerHtml: string }) {
  const [contacts, setContacts] = useState(initialContacts);
  const [contactId, setContactId] = useState(initialContacts[0]?.id ?? '');
  const [subject, setSubject] = useState(INTERIOR_DESIGNER_MAILER_SUBJECT);
  const [htmlCopy, setHtmlCopy] = useState(mailerHtml);
  const [textCopy, setTextCopy] = useState(INTERIOR_DESIGNER_MAILER_TEXT);
  const [sent, setSent] = useState<Record<string, SentContactRecord>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [sending, setSending] = useState(false);
  const contact = contacts.find((entry) => entry.id === contactId) ?? contacts[0];
  const unsentContacts = contacts.filter((entry) => !sent[entry.id]);
  const selectedContacts = contacts.filter((entry) => selectedIds.includes(entry.id) && !sent[entry.id]);
  const rendered = useMemo(() => contact ? renderMessage({ html: htmlCopy, text: textCopy, subject, data: mergeData(contact) }) : null, [contact, htmlCopy, subject, textCopy]);
  const warnings = rendered ? imageWarnings(rendered.html) : [];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const parsed = JSON.parse(window.localStorage.getItem(SENT_CONTACTS_STORAGE_KEY) ?? '[]');
        if (Array.isArray(parsed)) setSent(sentContactMap(parsed));
        const erased = JSON.parse(window.localStorage.getItem(ERASED_CONTACTS_STORAGE_KEY) ?? '[]');
        if (Array.isArray(erased)) setContacts(initialContacts.filter((entry) => !erased.includes(entry.id)));
      } catch { setSent({}); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialContacts]);

  function persistRecord(record: SentContactRecord) {
    setSent((current) => {
      const next = { ...current, [record.contactId]: record };
      window.localStorage.setItem(SENT_CONTACTS_STORAGE_KEY, JSON.stringify(Object.values(next)));
      return next;
    });
  }

  function resetSent() {
    if (!window.confirm('Reset sent history for every contact? This will allow those addresses to be selected again.')) return;
    window.localStorage.removeItem(SENT_CONTACTS_STORAGE_KEY);
    setSent({});
    setStatusMessage('Sent history reset. All visible contacts are available again.');
  }

  async function sendTo(contactToSend: AddressBookContact) {
    const message = renderMessage({ html: htmlCopy, text: textCopy, subject, data: mergeData(contactToSend) });
    const response = await fetch('/api/admin/outreach/campaigns/local/send-test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ to: contactToSend.email, from: 'hello@akiwumiphoto.com', replyTo: 'hello@akiwumiphoto.com', subject: message.subject, html: message.html, text: message.text }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? 'Unable to send message');
    persistRecord({ contactId: contactToSend.id, email: contactToSend.email, sentAt: new Date().toISOString(), providerMessageId: result.providerMessageId, subject: message.subject });
    return result.providerMessageId as string;
  }

  async function sendSelected() {
    if (selectedContacts.length === 0) { setStatusMessage('Select at least one available contact.'); return; }
    if (!window.confirm(`Record personalized sends for ${selectedContacts.length} contacts? Already-sent contacts will be skipped.`)) return;
    setSending(true); setStatusMessage('');
    let completed = 0;
    try {
      for (const selected of selectedContacts) { await sendTo(selected); completed += 1; }
      setSelectedIds([]);
      setStatusMessage(`Recorded ${completed} personalized local mock sends. No external email was sent.`);
    } catch (error) { setStatusMessage(`${completed} recorded. ${error instanceof Error ? error.message : 'Unable to complete bulk send.'}`); }
    finally { setSending(false); }
  }

  async function sendCurrent() {
    if (!contact || sent[contact.id]) return;
    setSending(true); setStatusMessage('');
    try { const providerMessageId = await sendTo(contact); setStatusMessage(`Recorded local mock send for ${contact.email} · ${providerMessageId}`); }
    catch (error) { setStatusMessage(error instanceof Error ? error.message : 'Unable to send message'); }
    finally { setSending(false); }
  }

  function toggleSelected(id: string) { setSelectedIds((current) => current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]); }

  if (!contact || !rendered) return <p className={styles.notice}>No contacts are available for preview.</p>;
  return <>
    <section className={styles.panel}>
      <div className={styles.panelHead}><div><h2 className={styles.panelTitle}>Bulk personalized send</h2><p className={styles.panelMeta}>Review the edited copy, select recipients, then record one personalized message per address.</p></div><span className={`${styles.chip} ${styles.chipWarn}`}>local mock provider</span></div>
      <div className={styles.bulkList}>{contacts.map((entry) => { const isSent = Boolean(sent[entry.id]); return <label key={entry.id} className={`${styles.bulkRow} ${isSent ? styles.bulkRowSent : ''}`}><input className={styles.checkbox} type="checkbox" checked={selectedIds.includes(entry.id)} disabled={isSent || sending} onChange={() => toggleSelected(entry.id)} /><span className={styles.bulkRowLabel}><span className={styles.bulkRowName}>{entry.name} · {entry.studio}</span><span className={styles.bulkRowEmail}>{entry.email}</span></span>{isSent ? <span className={`${styles.chip} ${styles.chipGood}`}>sent</span> : <span className={styles.chip}>available</span>}</label>; })}</div>
      <div className={styles.bulkToolbar}><span className={styles.bulkCount}>{Object.keys(sent).length} sent · {unsentContacts.length} available · {selectedContacts.length} selected</span><div className={styles.actions}><button type="button" className={styles.buttonSecondary} disabled={sending || unsentContacts.length === 0} onClick={() => setSelectedIds(unsentContacts.map((entry) => entry.id))}>Select all available</button><button type="button" className={styles.buttonSecondary} disabled={sending} onClick={() => setSelectedIds([])}>Clear</button><button type="button" className={styles.buttonSecondary} disabled={sending} onClick={resetSent}>Reset sent history</button><button type="button" className={styles.button} disabled={sending || selectedContacts.length === 0} onClick={sendSelected}>{sending ? 'Recording…' : `Send ${selectedContacts.length || ''} personalized email${selectedContacts.length === 1 ? '' : 's'} →`}</button></div></div>
    </section>

    <section className={styles.panel}>
      <div className={styles.panelHead}><div><h2 className={styles.panelTitle}>Review and edit email copy</h2><p className={styles.panelMeta}>Use merge fields such {'{{first_name}}'}, {'{{company_name}}'}, {'{{website}}'}, and {'{{city}}'}.</p></div></div>
      <div className={styles.formGrid}>
        <div className={styles.field}><label htmlFor="campaign-subject">Subject</label><input id="campaign-subject" className={styles.input} value={subject} onChange={(event) => setSubject(event.target.value)} /></div>
        <div className={styles.field}><label htmlFor="preview-contact">Preview recipient</label><select id="preview-contact" className={styles.select} value={contact.id} onChange={(event) => { setContactId(event.target.value); setStatusMessage(''); }}>{contacts.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.studio} · {entry.email}</option>)}</select></div>
        <div className={styles.field}><label htmlFor="campaign-text">Plain-text copy</label><textarea id="campaign-text" className={styles.textarea} value={textCopy} onChange={(event) => setTextCopy(event.target.value)} /><span className={styles.editorHint}>Plain-text fallback sent alongside the HTML version.</span></div>
        <div className={styles.field}><label htmlFor="campaign-html">HTML copy</label><textarea id="campaign-html" className={styles.textarea} value={htmlCopy} onChange={(event) => setHtmlCopy(event.target.value)} /><span className={styles.editorHint}>HTML is editable. Keep merge fields in double braces.</span></div>
      </div>
    </section>

    <section className={styles.panel}>
      <div className={styles.panelHead}><div><h2 className={styles.panelTitle}>Personalized preview</h2><p className={styles.panelMeta}>Previewing {contact.email} · greeting: Hello {firstName(contact.name)},</p></div></div>
      <div className={styles.formGrid}><div className={`${styles.field} ${styles.fieldFull}`}><div className={styles.previewMeta}><span>To: {contact.email}</span><span>Studio: {contact.studio}</span><span>{sent[contact.id] ? 'Already sent — choose another recipient' : 'Available to send'}</span></div><iframe className={styles.mailerPreview} title={`Personalized mailer for ${contact.name}`} srcDoc={rendered.html} /></div>
        {warnings.length > 0 && <div className={`${styles.field} ${styles.fieldFull}`}><div className={styles.notice}>The preview is using fresh gallery image URLs. Before a large production send, replace expiring image links with permanent public URLs or inline attachments.</div></div>}
        <div className={`${styles.field} ${styles.fieldFull}`}><div className={styles.actions}><button type="button" className={styles.button} onClick={sendCurrent} disabled={sending || Boolean(sent[contact.id])}>{sent[contact.id] ? 'Already sent — duplicate blocked' : sending ? 'Recording…' : `Send personalized email to ${contact.name} →`}</button></div>{statusMessage && <p className={styles.success}>{statusMessage}</p>}</div>
      </div>
    </section>
  </>;
}
