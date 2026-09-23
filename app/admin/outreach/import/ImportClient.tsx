'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../Outreach.module.css';
import type { AddressBookContact } from '@/lib/outreach/address-book';
import type { OutreachContactCategory } from '@/lib/outreach/categories-server';

type ImportResult = { error?: string; ok?: boolean; importedCount?: number; duplicateCount?: number; message?: string };

export default function ImportClient({ initialContacts, initialCategories }: { initialContacts: AddressBookContact[]; initialCategories: OutreachContactCategory[] }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [categories, setCategories] = useState(initialCategories);
  const [categoryId, setCategoryId] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function importWorkbook() {
    if (!file || !categoryId) { setResult({ error: !file ? 'Choose an .xlsx workbook first.' : 'Choose a contact category before importing.' }); return; }
    setBusy(true); setResult(null);
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('commit', '1');
      form.set('categoryId', categoryId);
      const response = await fetch('/api/admin/outreach/import', { method: 'POST', body: form });
      const payload = await response.json() as ImportResult;
      setResult(payload);
      if (response.ok) router.refresh();
    } catch { setResult({ error: 'Import failed. Check the server connection and try again.' }); }
    finally { setBusy(false); }
  }

  async function createCategory() {
    const name = newCategory.trim();
    if (!name) { setResult({ error: 'Enter a category name before creating it.' }); return; }
    setCreatingCategory(true); setResult(null);
    try {
      const response = await fetch('/api/admin/outreach/categories', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) });
      const payload = await response.json() as { error?: string; category?: OutreachContactCategory };
      if (!response.ok || !payload.category) { setResult({ error: payload.error || 'Could not create the contact category.' }); return; }
      setCategories((current) => [...current.filter((category) => category.id !== payload.category!.id), payload.category!].sort((left, right) => left.name.localeCompare(right.name)));
      setCategoryId(payload.category.id); setNewCategory('');
    } catch { setResult({ error: 'Could not create the contact category. Check the server connection and try again.' }); }
    finally { setCreatingCategory(false); }
  }

  return <section className={styles.panel}>
    <div className={styles.notice}>Workbook rows are imported directly into Supabase and the address book as approved contacts. No email is sent by importing.</div>
    <div className={styles.formGrid}>
      <div className={`${styles.field} ${styles.fieldFull}`}>
        <label htmlFor="workbook">Source workbook</label>
        <input className={styles.input} id="workbook" type="file" accept=".xlsx" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setResult(null); }} />
        {file && <small>{file.name} · ready to import</small>}
      </div>
      <div className={styles.field}>
        <label htmlFor="import-category">Contact category</label>
        <select id="import-category" className={styles.select} value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setResult(null); }}>
          <option value="">Choose a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </div>
      <div className={styles.field}>
        <label htmlFor="new-import-category">Create category</label>
        <div className={styles.actions}><input id="new-import-category" className={styles.input} placeholder="e.g. Galleries" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} /><button type="button" className={styles.buttonSecondary} disabled={creatingCategory} onClick={createCategory}>{creatingCategory ? 'Creating…' : 'Create'}</button></div>
      </div>
      <div className={`${styles.field} ${styles.fieldFull}`}>
        <label>Current address book · {initialContacts.length} rows</label>
        <div className={styles.panel}><table className={styles.table}><thead><tr><th>Name</th><th>Studio</th><th>Primary email</th><th>Status</th></tr></thead><tbody>{initialContacts.slice(0, 5).map((contact) => <tr key={contact.id}><td>{contact.name}</td><td>{contact.studio}</td><td>{contact.email}</td><td>{contact.suppressed ? 'suppressed' : contact.approvedForOutreach ? 'ready' : 'needs review'}</td></tr>)}</tbody></table></div>
      </div>
      <div className={`${styles.field} ${styles.fieldFull}`}><button type="button" className={styles.button} disabled={busy || !file || !categoryId} onClick={importWorkbook}>{busy ? 'Importing…' : 'Import into Supabase & address book →'}</button></div>
      {result?.error && <p className={styles.notice}>{result.error}</p>}
      {result?.ok && <p className={styles.success}>{result.message} {result.duplicateCount ? `${result.duplicateCount} existing rows were updated.` : ''}</p>}
    </div>
  </section>;
}
