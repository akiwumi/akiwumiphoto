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
  return <button type="button" className={`${styles.tableAction} ${styles.tableDanger}`} onClick={erase} disabled={busy}>{busy ? 'Erasing…' : 'Erase registration'}</button>;
}
