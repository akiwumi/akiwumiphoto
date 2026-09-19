'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Mode = 'login' | 'signup' | 'reset' | 'resend' | 'update';
type User = { email?: string | null } | null;

async function send(path: string, payload: Record<string, string>) {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

export default function AccountClient({ accountError = false }: { accountError?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const requestedMode = params.get('mode');
  const [mode, setMode] = useState<Mode>(requestedMode === 'signup' ? 'signup' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [user, setUser] = useState<User>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => { if (active) setUser(data.user); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  const verify = params.get('verify');
  const verificationError = verify === 'expired'
    ? 'That verification link has expired. Request a fresh one below.'
    : verify ? 'We could not confirm that link. Request a fresh one below.' : '';
  const recoveryMode = params.get('recovery') === '1';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (mode === 'update') {
        if (password.length < 8) throw new Error('Choose a password of at least 8 characters.');
        if (password !== confirmPassword) throw new Error('The passwords do not match.');
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        setMessage('Your password has been updated.');
        setPassword(''); setConfirmPassword('');
        return;
      }
      if (mode === 'login') {
        const { data: signedIn, error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (loginError || !signedIn.user) throw new Error('The email or password is incorrect.');
        if (!signedIn.user.email_confirmed_at) {
          await supabase.auth.signOut();
          throw new Error('Please verify your email before signing in.');
        }
        window.location.assign('/account');
        return;
      }
      const payload = { email: email.trim().toLowerCase(), ...(mode === 'signup' ? { password } : {}) };
      const path = mode === 'signup' ? '/api/account/signup' : mode === 'reset' ? '/api/account/password-reset' : '/api/account/resend-verification';
      const data = await send(path, payload);
      setMessage(data.message || 'Check your inbox for the next step.');
      if (mode === 'signup' || mode === 'reset' || mode === 'resend') setPassword('');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  };

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (password.length < 8) throw new Error('Choose a password of at least 8 characters.');
      if (password !== confirmPassword) throw new Error('The passwords do not match.');
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setMessage('Your password has been updated.'); setPassword(''); setConfirmPassword('');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Password update failed. Please try again.'); }
    finally { setBusy(false); }
  };

  const signOut = async () => {
    setBusy(true);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError('We could not sign you out. Please try again.');
    else { setUser(null); router.replace('/?logged_out=1'); }
    setBusy(false);
  };
  if (user && recoveryMode) return <section className="register-panel" style={{ maxWidth: 620 }}>
    <h2 className="register-section-title">Choose a new password</h2>
    {message && <p role="status" className="register-notice">{message}</p>}
    {error && <p role="alert" className="register-notice">{error}</p>}
    <form onSubmit={updatePassword} className="flex flex-col gap-4">
      <div><label className="register-label" htmlFor="account-new-password">New password</label><input id="account-new-password" className="register-field field-focus" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
      <div><label className="register-label" htmlFor="account-confirm-password">Confirm new password</label><input id="account-confirm-password" className="register-field field-focus" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></div>
      <button type="submit" className="register-submit" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button>
    </form>
  </section>;
  if (user) return <section className="register-panel" style={{ maxWidth: 620 }}><h2 className="register-section-title">Welcome back</h2><p style={{ color: 'var(--site-text)', marginBottom: 24 }}>{user.email}</p><p>Your purchases and certificates will appear here once your paid print order is linked to this account.</p><div className="account-actions">{accountError && <button type="button" className="account-refresh-button" onClick={() => router.refresh()}>Refresh account</button>}<button type="button" className="register-linkish" onClick={signOut} disabled={busy}>{busy ? 'Signing out…' : 'Sign out'}</button></div></section>;

  const labels: Record<Mode, string> = { login: 'Sign in', signup: 'Create account', reset: 'Reset password', resend: 'Resend verification', update: 'Update password' };
  return <section className="register-panel" style={{ maxWidth: 620 }}>
    <h2 className="register-section-title">{labels[mode]}</h2>
    {message && <p role="status" className="register-notice">{message}</p>}
    {(error || verificationError) && <p role="alert" className="register-notice">{error || verificationError}</p>}
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div><label className="register-label" htmlFor="account-email">Email</label><input id="account-email" className="register-field field-focus" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
      {(mode === 'login' || mode === 'signup') && <div><label className="register-label" htmlFor="account-password">Password</label><input id="account-password" className="register-field field-focus" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>}
      <button type="submit" className="register-submit" disabled={busy}>{busy ? 'Please wait…' : labels[mode]}</button>
    </form>
    <div className="flex flex-wrap gap-4" style={{ marginTop: 22 }}>
      {mode !== 'login' && <button type="button" className="register-linkish" onClick={() => { setMode('login'); setError(''); setMessage(''); }}>Sign in</button>}
      {mode !== 'signup' && <button type="button" className="register-linkish" onClick={() => { setMode('signup'); setError(''); setMessage(''); }}>Register</button>}
      {mode !== 'reset' && <button type="button" className="register-linkish" onClick={() => { setMode('reset'); setError(''); setMessage(''); }}>Forgot password?</button>}
      {mode !== 'resend' && <button type="button" className="register-linkish" onClick={() => { setMode('resend'); setError(''); setMessage(''); }}>Resend verification</button>}
    </div>
  </section>;
}
