'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const isDemo = form.email === 'admin@akiwumi.photo' && form.password === 'akiwumi2024';

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (authError) throw authError;
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
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              required
              autoComplete="current-password"
              className="w-full h-12 px-4 bg-black text-white text-base"
              style={{ border: '2px solid #666', outline: 'none', fontFamily: 'inherit' }}
              onFocus={(e) => (e.target.style.borderColor = '#E8001C')}
              onBlur={(e) => (e.target.style.borderColor = '#666')}
            />
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
        </form>
      </div>
    </main>
  );
}
