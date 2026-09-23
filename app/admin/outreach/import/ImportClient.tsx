'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../Outreach.module.css';
import type { AddressBookContact } from '@/lib/outreach/address-book';
import type { OutreachContactCategory } from '@/lib/outreach/categories-server';

type SkippedRow = { rowNumber: number; issues: string[] };
type ImportResult = { error?: string; ok?: boolean; importedCount?: number; duplicateCount?: number; skippedCount?: number; skippedRows?: SkippedRow[]; message?: string };

export default function ImportClient({ initialContacts, initialCategories }: { initialContacts: AddressBookContact[]; initialCategories: OutreachContactCategory[] }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [categories, setCategories] = useState(initialCategories);
  const [categoryId, setCategoryId] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [draggingFile, setDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function selectFile(nextFile: File | null) {
    if (busy || !nextFile) return;
    if (!/\.(csv|xlsx)$/i.test(nextFile.name)) {
      setFile(null);
      setResult({ error: 'Choose a .csv or .xlsx file.' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setFile(nextFile);
    setResult(null);
  }

  async function importWorkbook() {
    if (!file || !categoryId) { setResult({ error: !file ? 'Choose a .csv or .xlsx file.' : 'Choose a contact category before importing.' }); return; }
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
        <label id="import-file-label" htmlFor="workbook">Source file</label>
        <input ref={fileInputRef} className={styles.srOnly} disabled={busy} id="workbook" type="file" accept=".csv,.xlsx" onChange={(event) => selectFile(event.target.files?.[0] ?? null)} />
        <div
          aria-describedby="import-file-hint import-file-status"
          aria-disabled={busy}
          aria-labelledby="import-file-label"
          className={`${styles.dropZone} ${draggingFile ? styles.dropZoneDragging : ''}`}
          onClick={() => { if (!busy) fileInputRef.current?.click(); }}
          onDragEnter={(event) => { event.preventDefault(); if (!busy) setDraggingFile(true); }}
          onDragLeave={(event) => { event.preventDefault(); setDraggingFile(false); }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => { event.preventDefault(); setDraggingFile(false); if (!busy) selectFile(event.dataTransfer.files?.[0] ?? null); }}
          onKeyDown={(event) => { if (!busy && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); fileInputRef.current?.click(); } }}
          role="button"
          tabIndex={busy ? -1 : 0}
        >
          <strong>{draggingFile ? 'Drop the file to select it' : 'Drag and drop a CSV or XLSX file here'}</strong>
          <span id="import-file-hint">or press Enter or Space to browse</span>
        </div>
        <small id="import-file-status" className={styles.dropZoneStatus}>{file ? `${file.name} · ready to import` : 'No file selected'}</small>
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
      {result?.error && <p className={styles.notice} role="alert">{result.error}</p>}
      {result?.ok && <div className={styles.importResult} role="status">
        <p className={styles.success}>{result.message} {result.duplicateCount ? `${result.duplicateCount} existing rows were updated.` : ''} {result.skippedCount ?? 0} invalid {result.skippedCount === 1 ? 'row was' : 'rows were'} skipped.</p>
        {(result.skippedRows?.length ?? 0) > 0 && <ul className={styles.skippedRows}>{result.skippedRows!.slice(0, 10).map((row) => <li key={row.rowNumber}>Row {row.rowNumber}: {row.issues.join(', ') || 'Invalid contact'}</li>)}</ul>}
        {(result.skippedRows?.length ?? 0) > 10 && <p className={styles.panelMeta}>{result.skippedRows!.length - 10} more skipped rows are not shown.</p>}
      </div>}
    </div>
  </section>;
}
