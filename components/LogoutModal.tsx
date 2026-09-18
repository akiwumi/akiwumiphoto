'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export default function LogoutModal() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOpen = pathname === '/' && searchParams.get('logged_out') === '1';

  const close = () => router.replace('/', { scroll: false });

  if (!isOpen) return null;

  return (
    <div
      className="site-modal site-logout-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}
    >
      <div className="site-modal-panel">
        <div className="site-modal-top">
          <span>Account</span>
          <button type="button" className="site-modal-close" aria-label="Close" onClick={close}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <h2 id="logout-modal-title">You’re all signed out</h2>
        <div className="site-modal-body">
          <p>You’ve been logged out successfully. Thanks for spending time with Akiwumi Photo.</p>
          <p>Whenever you’re ready, take another look through the photographs and find a story that stays with you.</p>
        </div>
        <div className="site-modal-actions">
          <Link href="/home" className="site-modal-cta">Browse the gallery</Link>
          <button type="button" className="site-modal-later site-logout-dismiss" onClick={close}>Continue home</button>
        </div>
      </div>
    </div>
  );
}
