'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';
import { useCookieConsent } from './CookieConsentProvider';
import type { AnalyticsEventName, AnalyticsMetadata } from '@/lib/analytics';

const TOKEN_KEY = 'akiwumi-analytics-token-v1';
const sentPaths = new Set<string>();
let token: string | null = null;

function getToken() {
  if (token) return token;
  try {
    token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      token = `${crypto.randomUUID()}${crypto.randomUUID().replaceAll('-', '')}`;
      window.localStorage.setItem(TOKEN_KEY, token);
    }
  } catch { return null; }
  return token;
}

export function trackAnalyticsEvent(name: AnalyticsEventName, metadata: AnalyticsMetadata = {}): boolean {
  const visitorToken = getToken();
  if (!visitorToken) return false;
  const body = JSON.stringify({ consent: true, eventName: name, path: window.location.pathname, visitorToken, sessionId: visitorToken, metadata, referrer: document.referrer });
  try {
    if (navigator.sendBeacon) {
      const accepted = navigator.sendBeacon('/api/analytics/event', new Blob([body], { type: 'application/json' }));
      if (accepted) return true;
    }
    void fetch('/api/analytics/event', { method: 'POST', headers: { 'content-type': 'application/json', 'x-analytics-consent': 'accepted' }, body, keepalive: true }).catch(() => undefined);
    return true;
  } catch { /* analytics never blocks site interactions */ return false; }
}

export default function AnalyticsTracker() {
  const { status } = useCookieConsent();
  const pathname = usePathname() || '/';
  const track = useCallback(() => {
    if (status !== 'accepted' || sentPaths.has(pathname)) return;
    if (trackAnalyticsEvent('page_view')) sentPaths.add(pathname);
  }, [pathname, status]);
  const lastStatus = useRef(status);
  useEffect(() => {
    if (lastStatus.current !== status) lastStatus.current = status;
    track();
  }, [status, track]);
  return null;
}
