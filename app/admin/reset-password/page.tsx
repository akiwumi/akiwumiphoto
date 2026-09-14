'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';

const MIN_LENGTH = 10;

type Status = 'checking' | 'ready' | 'invalid' | 'saving' | 'done';

/**
 * Reached from the password reset email via /auth/confirm, which has already
 * exchanged the link for a session. Without that session there is nothing to
 * update, so the page offers a fresh link instead of a form.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const linkError = new URLSearchParams(window.location.search).get('error');
    supabase.auth.getUser().then(({ data: { user } }) => {
      setStatus(user && !linkError ? 'ready' : 'invalid');
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }

    setStatus('saving');
    const { data, error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      console.error('[admin/reset-password] Update failed:', updateError.status, updateError.message);
      // Supabase's own messages here (too weak, same as before) are readable.
      setError(updateError.message || 'The password could not be changed. Please try again.');
      setStatus('ready');
      return;
    }

    if (isAdmin(data.user)) {
      router.push('/admin/dashboard');
      return;
    }

    // Not the admin account: the password is changed, but there is no
    // dashboard to show, so end the session here.
    await supabase.auth.signOut();
    setStatus('done');
  };

  const fieldStyle = { border: '2px solid #666', outline: 'none', fontFamily: 'inherit' };

  return (
    <main className="full-screen bg-black flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-white font-bold text-lg uppercase" style={{ letterSpacing: '0.12em' }}>
            AKIWUMI PHOTO
          </p>
          <p className="text-grey-mid text-sm uppercase mt-1" style={{ letterSpacing: '0.15em' }}>
            NEW PASSWORD
          </p>
        </div>

        {status === 'checking' && (
          <p className="text-grey-mid text-sm text-center" role="status">Checking your link…</p>
        )}

        {status === 'invalid' && (
          <div className="flex flex-col gap-4 text-center">
            <p className="text-white text-sm leading-relaxed">
              This reset link has expired, has already been used, or was opened in a different
              browser from the one that requested it.
            </p>
            <Link href="/admin" className="admin-text-link">Request a new link from the login page</Link>
          </div>
        )}

        {status === 'done' && (
          <div className="flex flex-col gap-4 text-center">
            <p className="text-white text-sm leading-relaxed">
              Your password has been changed, but this account does not have admin access.
            </p>
            <Link href="/admin" className="admin-text-link">Back to login</Link>
          </div>
        )}

        {(status === 'ready' || status === 'saving') && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="new-password" className="block text-grey-mid text-xs font-medium uppercase mb-1.5" style={{ letterSpacing: '0.1em' }}>
                New password
              </label>
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={MIN_LENGTH}
                autoComplete="new-password"
                className="w-full h-12 px-4 bg-black text-white text-base"
                style={fieldStyle}
                onFocus={(e) => (e.target.style.borderColor = '#E8001C')}
                onBlur={(e) => (e.target.style.borderColor = '#666')}
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-grey-mid text-xs font-medium uppercase mb-1.5" style={{ letterSpacing: '0.1em' }}>
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={MIN_LENGTH}
                autoComplete="new-password"
                className="w-full h-12 px-4 bg-black text-white text-base"
                style={fieldStyle}
                onFocus={(e) => (e.target.style.borderColor = '#E8001C')}
                onBlur={(e) => (e.target.style.borderColor = '#666')}
              />
            </div>

            <label className="flex items-center gap-2 text-grey-mid text-xs cursor-pointer">
              <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
              Show passwords
            </label>

            {error && (
              <p className="text-sm text-center" style={{ color: '#E8001C' }} role="alert">{error}</p>
            )}

            <button
              type="submit"
              disabled={status === 'saving'}
              className="w-full h-12 text-white font-medium uppercase text-sm mt-2"
              style={{
                background: status === 'saving' ? '#999' : '#E8001C',
                letterSpacing: '0.12em',
                cursor: status === 'saving' ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {status === 'saving' ? 'Saving…' : 'Set new password'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
