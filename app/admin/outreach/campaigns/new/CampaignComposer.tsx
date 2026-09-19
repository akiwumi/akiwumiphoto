'use client';

import { useMemo, useState } from 'react';
import { renderMessage, imageWarnings } from '@/lib/outreach/render';
import { INTERIOR_DESIGNER_MAILER_HTML, INTERIOR_DESIGNER_MAILER_SUBJECT, INTERIOR_DESIGNER_MAILER_TEXT } from '@/lib/outreach/mailer-template';
import type { AddressBookContact } from '@/lib/outreach/address-book';
import styles from '../../Outreach.module.css';

function firstName(name: string): string {
  if (/founding design team/i.test(name)) return 'Studio Force Majeure team';
  if (name.includes('&')) return name.split('&')[0].trim();
  return name.split(/\s+/)[0] ?? name;
}

export default function CampaignComposer({ contacts }: { contacts: AddressBookContact[] }) {
  const [contactId, setContactId] = useState(contacts[0]?.id ?? '');
  const [sentMessage, setSentMessage] = useState('');
  const [sending, setSending] = useState(false);
  const contact = contacts.find((entry) => entry.id === contactId) ?? contacts[0];
  const rendered = useMemo(() => contact ? renderMessage({
    html: INTERIOR_DESIGNER_MAILER_HTML,
    text: INTERIOR_DESIGNER_MAILER_TEXT,
    subject: INTERIOR_DESIGNER_MAILER_SUBJECT,
    data: { first_name: firstName(contact.name), company_name: contact.studio, website: contact.website, city: contact.country === 'Sweden' ? 'Stockholm' : null },
  }) : null, [contact]);
  const warnings = rendered ? imageWarnings(rendered.html) : [];

  async function sendTest() {
    if (!contact) return;
    setSending(true); setSentMessage('');
    try {
      const response = await fetch('/api/admin/outreach/campaigns/local/send-test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ to: contact.email, from: 'hello@akiwumiphoto.com', replyTo: 'hello@akiwumiphoto.com', subject: rendered.subject, html: rendered.html, text: rendered.text }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Unable to send test');
      setSentMessage(`Local mock send recorded for ${contact.email} · ${result.providerMessageId}`);
    } catch (error) { setSentMessage(error instanceof Error ? error.message : 'Unable to send test'); }
    finally { setSending(false); }
  }

  if (!contact || !rendered) return <p className={styles.notice}>No contacts are available for preview.</p>;
  return <>
    <section className={styles.panel}>
      <div className={styles.panelHead}><div><h2 className={styles.panelTitle}>Personalized preview</h2><p className={styles.panelMeta}>Every preview is rendered for one address-book contact.</p></div><span className={`${styles.chip} ${styles.chipWarn}`}>local mock provider</span></div>
      <div className={styles.formGrid}>
        <div className={styles.field}><label htmlFor="preview-contact">Preview recipient</label><select id="preview-contact" className={styles.select} value={contact.id} onChange={(event) => { setContactId(event.target.value); setSentMessage(''); }}>{contacts.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.studio} · {entry.email}</option>)}</select></div>
        <div className={styles.field}><label>Personalized subject</label><input className={styles.input} readOnly value={rendered.subject} /></div>
        <div className={`${styles.field} ${styles.fieldFull}`}><div className={styles.previewMeta}><span>To: {contact.email}</span><span>Greeting: Hello {firstName(contact.name)},</span><span>Studio: {contact.studio}</span></div><iframe className={styles.mailerPreview} title={`Personalized mailer for ${contact.name}`} srcDoc={rendered.html} /></div>
        {warnings.length > 0 && <div className={`${styles.field} ${styles.fieldFull}`}><div className={styles.notice}>The local preview uses public image URLs. Before a large production send, confirm the image URLs remain permanent and deliverable.</div></div>}
        <div className={`${styles.field} ${styles.fieldFull}`}><div className={styles.actions}><button type="button" className={styles.button} onClick={sendTest} disabled={sending}>{sending ? 'Recording…' : `Send personalized test to ${contact.name} →`}</button></div>{sentMessage && <p className={styles.success}>{sentMessage}</p>}</div>
      </div>
    </section>
  </>;
}
