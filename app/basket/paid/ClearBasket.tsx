'use client';

import { useEffect } from 'react';
import { clearBasket, forgetCheckout } from '@/lib/basket-store';
import { getAnalyticsSessionId, getAnalyticsVisitorToken } from '@/components/AnalyticsTracker';
import { useCookieConsent } from '@/components/CookieConsentProvider';

/** The basket is kept through payment and emptied once the buyer is back. */
export default function ClearBasket({ sessionId }: { sessionId: string | null }) {
  const { status: consentStatus } = useCookieConsent();
  useEffect(() => {
    clearBasket();
    forgetCheckout();
    if (!sessionId) return;
    let cancelled = false;
    const visitorToken = consentStatus === 'accepted' ? getAnalyticsVisitorToken() : null;
    const analyticsSessionId = consentStatus === 'accepted' ? getAnalyticsSessionId() : null;
    const verify = async () => {
      for (let attempt = 0; attempt < 3 && !cancelled; attempt += 1) {
        try {
          const response = await fetch(`/api/print-orders/verify-paid?session_id=${encodeURIComponent(sessionId)}`, {
            cache: 'no-store',
            headers: consentStatus === 'accepted'
              ? { 'x-analytics-consent': 'accepted', ...(visitorToken ? { 'x-analytics-visitor-token': visitorToken } : {}), ...(analyticsSessionId ? { 'x-analytics-session-id': analyticsSessionId } : {}) }
              : undefined,
          });
          const result = response.ok ? await response.json() : null;
          if (result?.ok) return;
        } catch { /* retry the side effect without blocking the confirmation page */ }
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    };
    void verify();
    return () => { cancelled = true; };
  }, [consentStatus, sessionId]);
  return null;
}
