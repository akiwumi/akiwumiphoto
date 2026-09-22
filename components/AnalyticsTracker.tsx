'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { useCookieConsent } from './CookieConsentProvider';
import { getConsentStatus } from '@/lib/cookie-consent';
import type { AnalyticsEventName, AnalyticsMetadata } from '@/lib/analytics';

const TOKEN_KEY = 'akiwumi-analytics-token-v1';
const SESSION_KEY = 'akiwumi-analytics-session-v1';
const sentPaths = new Set<string>();
let token: string | null = null;
let sessionId: string | null = null;

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

/** Returns the opaque first-party token already used by analytics requests. */
export function getAnalyticsVisitorToken(): string | null {
  if (token) return token;
  try {
    token = window.localStorage.getItem(TOKEN_KEY);
    return token;
  } catch { return null; }
}

export function getAnalyticsSessionId(): string | null {
  if (sessionId) return sessionId;
  try {
    sessionId = window.sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = `${crypto.randomUUID()}${crypto.randomUUID().replaceAll('-', '')}`;
      window.sessionStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
  } catch { return null; }
}

export async function trackAnalyticsEvent(name: AnalyticsEventName, metadata: AnalyticsMetadata = {}): Promise<boolean> {
  try {
    if (getConsentStatus(window.localStorage) !== 'accepted') return false;
  } catch { return false; }
  const visitorToken = getToken();
  if (!visitorToken) return false;
  const activeSessionId = getAnalyticsSessionId();
  if (!activeSessionId) return false;
  const body = JSON.stringify({ consent: true, eventName: name, path: window.location.pathname, visitorToken, sessionId: activeSessionId, metadata, referrer: document.referrer });
  try {
    if (navigator.sendBeacon) {
      const accepted = navigator.sendBeacon('/api/analytics/event', new Blob([body], { type: 'application/json' }));
      if (accepted) return true;
    }
    const response = await fetch('/api/analytics/event', { method: 'POST', headers: { 'content-type': 'application/json', 'x-analytics-consent': 'accepted' }, body, keepalive: true });
    return response.ok;
  } catch { /* analytics never blocks site interactions */ return false; }
}

export default function AnalyticsTracker() {
  const { status } = useCookieConsent();
  const pathname = usePathname() || '/';
  const track = useCallback(() => {
    if (status !== 'accepted' || sentPaths.has(pathname)) return Promise.resolve(false);
    return trackAnalyticsEvent('page_view');
  }, [pathname, status]);
  useEffect(() => {
    void track().then((delivered) => {
      if (delivered) sentPaths.add(pathname);
    });
  }, [pathname, status, track]);
  return null;
}
