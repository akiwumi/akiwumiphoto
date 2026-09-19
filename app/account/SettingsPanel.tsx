'use client';

import { useState } from 'react';
import type { AccountCollector } from '@/lib/account-data';

type Props = { collector: AccountCollector | null };

export default function SettingsPanel({ collector }: Props) {
  const [form, setForm] = useState(() => ({
    first_name: collector?.first_name ?? '', last_name: collector?.last_name ?? '', email: collector?.email ?? '',
    phone: collector?.phone ?? '', address_line1: collector?.address_line1 ?? '', address_line2: collector?.address_line2 ?? '',
    city: collector?.city ?? '', region: collector?.region ?? '', postcode: collector?.postcode ?? '', country_code: collector?.country_code ?? '',
    currentPassword: '', newPassword: '',
  }));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const update = (name: string, value: string) => setForm((prev) => ({ ...prev, [name]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/account/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Your settings could not be updated.');
      setMessage(data.message); setForm((prev) => ({ ...prev, currentPassword: '', newPassword: '' }));
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Your settings could not be updated.'); }
    finally { setBusy(false); }
  };

  if (!collector) return <section className="register-panel"><h2 className="register-section-title">Settings</h2><p>Your registration details are not available yet.</p></section>;
  const field = (name: keyof typeof form, label: string, type = 'text') => <label className="register-label" htmlFor={`settings-${name}`}>{label}<input id={`settings-${name}`} className="register-field field-focus" type={type} value={form[name]} onChange={(event) => update(name, event.target.value)} /></label>;
  return <section className="register-panel account-settings" aria-labelledby="account-settings-title">
    <h2 id="account-settings-title" className="register-section-title">Your settings</h2>
    <p className="account-settings-intro">Keep your registered delivery details up to date. Your email is verified and cannot be changed here.</p>
    {message && <p className="register-notice" role="status">{message}</p>}
    {error && <p className="register-notice" role="alert">{error}</p>}
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="register-grid register-grid-pair">{field('first_name', 'First name')}{field('last_name', 'Last name')}</div>
      <label className="register-label" htmlFor="settings-email">Verified email<input id="settings-email" className="register-field" type="email" value={form.email} readOnly /></label>
      {field('phone', 'Phone', 'tel')}{field('address_line1', 'Address')}{field('address_line2', 'Address line 2')}
      <div className="register-grid register-grid-pair">{field('city', 'City')}{field('region', 'Region')}</div>
      <div className="register-grid register-grid-pair">{field('postcode', 'Postcode')}{field('country_code', 'Country code')}</div>
      <div className="account-password-fields"><h3>Change password</h3><p>Enter your current password to verify the change.</p>{field('currentPassword', 'Current password', 'password')}{field('newPassword', 'New password', 'password')}</div>
      <button type="submit" className="register-submit" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
    </form>
  </section>;
}
