'use client';
import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import styles from '../AdminShell.module.css';

export default function RegistrationActions({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  async function erase() {
    if (!window.confirm('Erase this registered print and all linked certificates? This cannot be undone.')) return;
    setBusy(true); const { error } = await getSupabaseBrowserClient().rpc('admin_reset_registrations', { p_registration_id: id }); setBusy(false);
    if (error) window.alert(error.message); else window.location.reload();
  }
  return <button type="button" className={`${styles.tableAction} ${styles.tableDanger}`} style={{ display: 'inline-flex', width: 'auto', minWidth: 0, height: 36, minHeight: 36, padding: '0 14px', fontSize: 13, lineHeight: 1, whiteSpace: 'nowrap' }} onClick={erase} disabled={busy}>{busy ? 'Erasing…' : 'Erase registration'}</button>;
}
