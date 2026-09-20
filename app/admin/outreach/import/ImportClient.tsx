'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../Outreach.module.css';
import type { AddressBookContact } from '@/lib/outreach/address-book';

type ImportResult = { error?: string; ok?: boolean; importedCount?: number; duplicateCount?: number; message?: string };

export default function ImportClient({ initialContacts }: { initialContacts: AddressBookContact[] }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function importWorkbook() {
    if (!file) { setResult({ error: 'Choose an .xlsx workbook first.' }); return; }
    setBusy(true); setResult(null);
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('commit', '1');
      const response = await fetch('/api/admin/outreach/import', { method: 'POST', body: form });
      const payload = await response.json() as ImportResult;
      setResult(payload);
      if (response.ok) router.refresh();
    } catch { setResult({ error: 'Import failed. Check the server connection and try again.' }); }
    finally { setBusy(false); }
  }

  return <section className={styles.panel}>
    <div className={styles.notice}>Workbook rows are imported directly into Supabase and the address book as approved contacts. No email is sent by importing.</div>
    <div className={styles.formGrid}>
      <div className={`${styles.field} ${styles.fieldFull}`}>
        <label htmlFor="workbook">Source workbook</label>
        <input className={styles.input} id="workbook" type="file" accept=".xlsx" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setResult(null); }} />
        {file && <small>{file.name} · ready to import</small>}
      </div>
      <div className={`${styles.field} ${styles.fieldFull}`}>
        <label>Current address book · {initialContacts.length} rows</label>
        <div className={styles.panel}><table className={styles.table}><thead><tr><th>Name</th><th>Studio</th><th>Primary email</th><th>Status</th></tr></thead><tbody>{initialContacts.slice(0, 5).map((contact) => <tr key={contact.id}><td>{contact.name}</td><td>{contact.studio}</td><td>{contact.email}</td><td>{contact.suppressed ? 'suppressed' : contact.approvedForOutreach ? 'ready' : 'needs review'}</td></tr>)}</tbody></table></div>
      </div>
      <div className={`${styles.field} ${styles.fieldFull}`}><button type="button" className={styles.button} disabled={busy || !file} onClick={importWorkbook}>{busy ? 'Importing…' : 'Import into Supabase & address book →'}</button></div>
      {result?.error && <p className={styles.notice}>{result.error}</p>}
      {result?.ok && <p className={styles.success}>{result.message} {result.duplicateCount ? `${result.duplicateCount} existing rows were updated.` : ''}</p>}
    </div>
  </section>;
}
