'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { isAdmin, PASSWORD_RESET_COOKIE } from '@/lib/admin-auth';

type Mode = 'login' | 'forgot' | 'sent';

export default function AdminLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const isDemo = form.email === 'admin@akiwumi.photo' && form.password === 'akiwumi2024';

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (authError) throw authError;

      // Collectors hold accounts too; a correct password alone is not access.
      if (!isAdmin(data.user)) {
        await supabase.auth.signOut();
        setError('This account does not have admin access.');
        setLoading(false);
        return;
      }

      router.push('/admin/dashboard');
      return;
    } catch {
      // Supabase not configured — allow demo credentials in dev
      if (process.env.NODE_ENV !== 'production' && isDemo) {
        router.push('/admin/dashboard');
        return;
      }
    }

    setError('Invalid credentials. Please try again.');
    setLoading(false);
  };

  // The link comes back through /auth/confirm, which must be an allowed
  // redirect URL in Supabase Auth; collector verification already uses it.
  // The reply never says whether the address has an account.
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${PASSWORD_RESET_COOKIE}=1; Path=/; Max-Age=3600; SameSite=Lax${secure}`;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: `${window.location.origin}/auth/confirm`,
    });

    setLoading(false);
    if (resetError?.status === 429) {
      setError('Too many reset emails have been requested. Please wait a few minutes and try again.');
      return;
    }
    if (resetError) {
      console.error('[admin] Password reset request failed:', resetError.status, resetError.message);
      setError('The reset email could not be sent. Please try again shortly.');
      return;
    }
    setMode('sent');
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setForm((p) => ({ ...p, password: '' }));
  };

  return (
    <main className="full-screen bg-black flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-white font-bold text-lg uppercase" style={{ letterSpacing: '0.12em' }}>
            AKIWUMI PHOTO
          </p>
          <p className="text-grey-mid text-sm uppercase mt-1" style={{ letterSpacing: '0.15em' }}>
            ADMIN
          </p>
        </div>

        {mode === 'sent' && (
          <div className="flex flex-col gap-4 text-center">
            <p className="text-white text-sm leading-relaxed">
              If that email belongs to the admin account, a reset link is on its way.
              Open it in this browser, within the hour.
            </p>
            <button type="button" onClick={() => switchMode('login')} className="admin-text-link">
              Back to login
            </button>
          </div>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className="flex flex-col gap-4">
            <p className="text-grey-mid text-sm leading-relaxed">
              Enter the admin email and we&apos;ll send a link to choose a new password.
            </p>
            <div>
              <label htmlFor="reset-email" className="block text-grey-mid text-xs font-medium uppercase mb-1.5" style={{ letterSpacing: '0.1em' }}>
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                required
                autoComplete="email"
                className="w-full h-12 px-4 bg-black text-white text-base"
                style={{ border: '2px solid #666', outline: 'none', fontFamily: 'inherit' }}
                onFocus={(e) => (e.target.style.borderColor = '#E8001C')}
                onBlur={(e) => (e.target.style.borderColor = '#666')}
              />
            </div>

            {error && (
              <p className="text-sm text-center" style={{ color: '#E8001C' }} role="alert">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-white font-medium uppercase text-sm mt-2"
              style={{
                background: loading ? '#999' : '#E8001C',
                letterSpacing: '0.12em',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <button type="button" onClick={() => switchMode('login')} className="admin-text-link">
              Back to login
            </button>
          </form>
        )}

        {mode === 'login' && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-grey-mid text-xs font-medium uppercase mb-1.5" style={{ letterSpacing: '0.1em' }}>
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              required
              autoComplete="email"
              className="w-full h-12 px-4 bg-black text-white text-base"
              style={{ border: '2px solid #666', outline: 'none', fontFamily: 'inherit' }}
              onFocus={(e) => (e.target.style.borderColor = '#E8001C')}
              onBlur={(e) => (e.target.style.borderColor = '#666')}
            />
          </div>

          <div>
            <label className="block text-grey-mid text-xs font-medium uppercase mb-1.5" style={{ letterSpacing: '0.1em' }}>
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                required
                autoComplete="current-password"
                className="w-full h-12 px-4 pr-12 bg-black text-white text-base"
                style={{ border: '2px solid #666', outline: 'none', fontFamily: 'inherit' }}
                onFocus={(e) => (e.target.style.borderColor = '#E8001C')}
                onBlur={(e) => (e.target.style.borderColor = '#666')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-0 top-0 h-12 w-12 flex items-center justify-center text-grey-mid hover:text-white"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-center" style={{ color: '#E8001C' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 text-white font-medium uppercase text-sm mt-2"
            style={{
              background: loading ? '#999' : '#E8001C',
              letterSpacing: '0.12em',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {loading ? 'Signing in…' : 'LOGIN'}
          </button>
          <button type="button" onClick={() => switchMode('forgot')} className="admin-text-link">
            Forgot password?
          </button>
        </form>
        )}
      </div>
    </main>
  );
}
