'use client';

import { useEffect } from 'react';
import { useCookieConsent } from '@/components/CookieConsentProvider';
import { trackAnalyticsEvent } from '@/components/AnalyticsTracker';

const KEY = 'akiwumi-analytics-registration-v1';

/** Records completion only on the server-confirmed verified account page. */
export default function RegistrationAnalytics() {
  const { status } = useCookieConsent();
  useEffect(() => {
    if (status !== 'accepted') return;
    try {
      if (window.sessionStorage.getItem(KEY)) return;
      void trackAnalyticsEvent('registration_complete').then((delivered) => {
        if (delivered) window.sessionStorage.setItem(KEY, '1');
      });
    } catch { /* analytics never blocks the verified page */ }
  }, [status]);
  return null;
}
