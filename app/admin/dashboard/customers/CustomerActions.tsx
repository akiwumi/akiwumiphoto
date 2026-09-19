'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../AdminShell.module.css';

type Collector = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  region?: string | null;
  postcode: string;
  country_code: string;
};

type Props = { collector: Collector };
type FormState = Omit<Collector, 'id'>;

const fields: Array<{ key: keyof FormState; label: string }> = [
  { key: 'first_name', label: 'First name' },
  { key: 'last_name', label: 'Last name' },
  { key: 'phone', label: 'Phone' },
  { key: 'address_line1', label: 'Address' },
  { key: 'address_line2', label: 'Address line 2' },
  { key: 'city', label: 'City' },
  { key: 'region', label: 'Region' },
  { key: 'postcode', label: 'Postcode' },
  { key: 'country_code', label: 'Country code' },
];

export default function CustomerActions({ collector }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<FormState>(() => ({
    first_name: collector.first_name ?? '', last_name: collector.last_name ?? '',
    phone: collector.phone ?? '', address_line1: collector.address_line1 ?? '',
    address_line2: collector.address_line2 ?? '', city: collector.city ?? '',
    region: collector.region ?? '', postcode: collector.postcode ?? '',
    country_code: collector.country_code ?? '',
  }));

  const update = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/admin/customers/${collector.id}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Could not save this user.');
      setEditing(false); setMessage('Details saved.'); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save this user.'); }
    finally { setBusy(false); }
  };

  const erase = async () => {
    if (!window.confirm(`Erase the registered profile for ${collector.first_name} ${collector.last_name}? This also removes its registrations.`)) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/admin/customers/${collector.id}`, { method: 'DELETE' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Could not erase this user.');
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not erase this user.'); setBusy(false); }
  };

  if (!editing) return <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
    <button type="button" className={styles.tableAction} onClick={() => { setMessage(''); setEditing(true); }}>Edit details</button>
    <button type="button" className={`${styles.tableDanger}`} onClick={erase} disabled={busy}>Erase user</button>
    {message && <span style={{ color: '#ffb3b3', fontSize: 13 }}>{message}</span>}
  </div>;

  return <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: 'var(--a-surface)' }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
      {fields.map(({ key, label }) => <label key={key} style={{ display: 'grid', gap: 6, color: 'var(--a-muted)', fontSize: 12 }}>
        {label}
        <input value={String(form[key] ?? '')} onChange={(event) => update(key, event.target.value)} style={{ width: '100%', minHeight: 40, padding: '0 10px', border: '1px solid var(--a-border)', borderRadius: 8, background: 'var(--a-bg)', color: 'var(--a-text)', font: 'inherit' }} />
      </label>)}
    </div>
    <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
      <button type="button" className={styles.primaryButton} onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save details'}</button>
      <button type="button" className={styles.ghostButton} onClick={() => { setEditing(false); setMessage(''); }} disabled={busy}>Cancel</button>
      {message && <span style={{ alignSelf: 'center', color: '#ffb3b3', fontSize: 13 }}>{message}</span>}
    </div>
  </div>;
}
