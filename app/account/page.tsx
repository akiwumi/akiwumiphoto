import type { Metadata } from 'next';
import NavBar from '@/components/NavBar';
import AccountClient from './AccountClient';
import AccountDashboard from './AccountDashboard';
import { createServerClient } from '@/lib/supabase-server';
import { loadAccountData } from '@/lib/account-data';

export const metadata: Metadata = {
  title: 'Your Account — AKIWUMI PHOTO',
  description: 'Sign in or create your AKIWUMI PHOTO account to access your print purchases.',
};

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  let user = null;
  let accountData = null;
  try {
    const db = await createServerClient();
    const result = await db.auth.getUser();
    user = result.data.user;
    if (user?.email_confirmed_at) accountData = await loadAccountData(db, user);
  } catch (error) {
    console.error('[account] Could not load account:', error);
  }
  return (
    <main className="register-page full-screen flex flex-col overflow-y-auto">
      <NavBar />
      <div className="register-content flex-1 page-enter" style={{ padding: '14px 60px 72px' }}>
        <h1 className="font-bold uppercase" style={{ color: '#FFFFFF', fontSize: 'clamp(1.5rem, 4vw, 3rem)', letterSpacing: '0.08em' }}>Your account</h1>
        <div className="red-rule" style={{ margin: '12px 0 20px' }} />
        <p style={{ maxWidth: '62ch', marginBottom: 32, color: 'rgba(255, 255, 255, 0.72)', fontSize: 'var(--body-size)', lineHeight: 1.65 }}>
          Create an account to keep your print purchases and certificates together.
        </p>
        {user?.email_confirmed_at && accountData ? <AccountDashboard email={user.email ?? ''} data={accountData} /> : <AccountClient accountError={Boolean(user?.email_confirmed_at && !accountData)} />}
      </div>
    </main>
  );
}
