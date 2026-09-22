import type { Metadata } from 'next';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import Reveal from '@/components/Reveal';
import { createServerClient } from '@/lib/supabase-server';
import PurchaseMessageClient from './PurchaseMessageClient';
import RegistrationAnalytics from './RegistrationAnalytics';

export const metadata: Metadata = {
  title: 'Account Verified — AKIWUMI PHOTO',
  robots: { index: false, follow: false },
};

// The page is meaningless without the session cookie the email link sets, so
// there is nothing to prerender — saying so keeps the build from trying.
export const dynamic = 'force-dynamic';

interface CollectorRecord {
  first_name: string;
  email: string;
  email_verified: boolean;
}

// Reached only by following the link in the verification email, which is what
// puts the session cookie in place.
async function loadCollector(): Promise<CollectorRecord | null> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Read as the collector: the RLS policy on collectors is what limits this
  // to their own row, so a stale or forged id cannot surface someone else's.
  const { data, error } = await supabase
    .from('collectors')
    .select('first_name, email, email_verified')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[register/verified] Could not read the collector record:', error);
    return null;
  }
  return data as CollectorRecord | null;
}

export default async function VerifiedPage() {
  let collector: CollectorRecord | null = null;
  try {
    collector = await loadCollector();
  } catch (err) {
    console.error('[register/verified] Supabase is unavailable:', err);
  }

  return (
    <main className="register-page full-screen flex flex-col overflow-y-auto">
      <NavBar />

      <div className="register-content flex-1 page-enter" style={{ padding: '14px 60px 72px' }}>
        {collector?.email_verified ? (
          <>
            <RegistrationAnalytics />
            <Reveal>
              <h1
                className="font-bold uppercase"
                style={{ color: 'var(--site-text)', fontSize: 'clamp(1.5rem, 4vw, 3rem)', letterSpacing: '0.08em' }}
              >
                ACCOUNT VERIFIED
              </h1>
              <div className="red-rule" style={{ margin: '12px 0 20px' }} />
              <p style={{ maxWidth: '62ch', marginBottom: 32, color: 'var(--site-text)', fontSize: 'var(--body-size)', lineHeight: 1.65 }}>
                Thank you, {collector.first_name} — your email address is confirmed and your details
                are on record. Now tell us about the photograph you bought.
              </p>
            </Reveal>

            <div className="register-layout">
              <PurchaseMessageClient email={collector.email} />

              <Reveal delay={0.12}>
                <aside className="register-panel">
                  <h2 className="register-section-title">Your registration</h2>
                  <dl className="register-summary">
                    <dt>Email</dt>
                    <dd>{collector.email}</dd>
                    <dt>Status</dt>
                    <dd style={{ color: 'var(--site-text)' }}>Verified</dd>
                  </dl>
                  <p style={{ marginTop: 20, color: 'var(--site-text)', fontSize: 'var(--body-size)', lineHeight: 1.6 }}>
                    Every message you send is logged against this account with a reference number, so
                    there is always a record of what you told us and when.
                  </p>
                </aside>
              </Reveal>
            </div>
          </>
        ) : (
          <Reveal>
            <h1
              className="font-bold uppercase"
              style={{ color: 'var(--site-text)', fontSize: 'clamp(1.5rem, 4vw, 3rem)', letterSpacing: '0.08em' }}
            >
              NOT VERIFIED YET
            </h1>
            <div className="red-rule" style={{ margin: '12px 0 20px' }} />
            <div className="register-panel register-confirmation" style={{ maxWidth: 620 }}>
              <p>
                We could not confirm your account from this browser. Open the link in your
                verification email again, or register once more to have a fresh link sent.
              </p>
              <Link href="/register" className="register-submit btn-lift" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                Back to registration
              </Link>
            </div>
          </Reveal>
        )}
      </div>
    </main>
  );
}
