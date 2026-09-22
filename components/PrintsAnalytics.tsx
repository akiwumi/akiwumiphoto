'use client';

import { useEffect } from 'react';
import { trackAnalyticsEvent } from './AnalyticsTracker';
import { useCookieConsent } from './CookieConsentProvider';

/** Records the print catalogue view without exposing pricing or buyer data. */
export default function PrintsAnalytics() {
  const { status } = useCookieConsent();
  useEffect(() => {
    if (status !== 'accepted') return;
    void trackAnalyticsEvent('product_view', { category: 'prints' });
  }, [status]);
  return null;
}
