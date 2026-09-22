import type { Metadata } from 'next';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import ClearBasket from './ClearBasket';
import { DISPATCH_NOTICE } from '@/lib/shipping';

export const metadata: Metadata = {
  title: 'Thank you | Akiwumi Photo',
  robots: { index: false },
};

/**
 * Where Stripe sends the buyer after paying. The order is settled by the
 * webhook, not by arriving here, so this page only thanks them.
 */
export default async function PaidPage({ searchParams }: { searchParams: Promise<{ ref?: string; session_id?: string }> }) {
  const { ref, session_id: sessionId } = await searchParams;
  const reference = typeof ref === 'string' && /^AP-\d{6}-[0-9A-F]{5}$/.test(ref) ? ref : null;
  const verifiedSessionId = typeof sessionId === 'string' && /^cs_[A-Za-z0-9_]+$/.test(sessionId) ? sessionId : null;

  return (
    <main className="full-screen flex flex-col overflow-y-auto">
      <NavBar />
      <ClearBasket sessionId={verifiedSessionId} />
      <div className="basket-content page-enter">
        <div className="basket-thanks" role="status">
          <h1>Thank you</h1>
          <p>
            Thank you for your purchase and for your interest in my work. Your payment for order
            {reference && <> <strong>{reference}</strong></>} has been received.
          </p>
          <p>
            A receipt is on its way to your email. Each print is produced to order, then signed and numbered
            by hand. I will be in touch when yours ships.
          </p>
          <p>{DISPATCH_NOTICE}</p>
          <Link href="/home" className="basket-button basket-button-secondary">Continue browsing</Link>
        </div>
      </div>
    </main>
  );
}
