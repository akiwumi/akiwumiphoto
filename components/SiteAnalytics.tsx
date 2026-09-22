'use client';

import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next';
import { useCookieConsent } from './CookieConsentProvider';

/**
 * Vercel Web Analytics, counting public visits only. Admin sessions would
 * inflate the numbers, and the register flow carries verification tokens in
 * its URLs, so neither is reported.
 */
function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  const { pathname } = new URL(event.url);
  if (pathname.startsWith('/admin') || pathname.startsWith('/auth') || pathname.startsWith('/register/verified')) {
    return null;
  }
  return event;
}

export default function SiteAnalytics() {
  const { status } = useCookieConsent();
  if (status !== 'accepted') return null;
  return <Analytics beforeSend={beforeSend} />;
}
