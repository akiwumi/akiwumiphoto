'use client';

import Link from 'next/link';
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { COOKIE_CONSENT_STORAGE_KEY, getConsentStatus, type ConsentStatus } from '@/lib/cookie-consent';
import styles from './CookieConsent.module.css';

type CookieConsentContextValue = {
  status: ConsentStatus;
  openSettings: () => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

const CONSENT_CHANGE_EVENT = 'akiwumi-cookie-consent-change';

function subscribeToConsent(listener: () => void) {
  window.addEventListener('storage', listener);
  window.addEventListener(CONSENT_CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener(CONSENT_CHANGE_EVENT, listener);
  };
}

function getBrowserConsentStatus() {
  return getConsentStatus(window.localStorage);
}

function getServerConsentStatus(): ConsentStatus {
  return 'unresolved';
}

export function useCookieConsent(): CookieConsentContextValue {
  const context = useContext(CookieConsentContext);
  if (!context) throw new Error('useCookieConsent must be used within CookieConsentProvider');
  return context;
}

export default function CookieConsentProvider({ children }: { children: ReactNode }) {
  const status = useSyncExternalStore(subscribeToConsent, getBrowserConsentStatus, getServerConsentStatus);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (settingsOpen && !dialog.open) dialog.showModal();
    if (!settingsOpen && dialog.open) dialog.close();
  }, [settingsOpen]);

  function savePreference(analytics: boolean) {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify({ analytics, decidedAt: Date.now() }));
      setAnalyticsEnabled(analytics);
      setSettingsOpen(false);
      window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
    } catch {
      // Storage failures keep optional analytics off and allow the visitor to retry.
      setAnalyticsEnabled(false);
    }
  }

  function openSettings() {
    setAnalyticsEnabled(status === 'accepted');
    setSettingsOpen(true);
  }

  return (
    <CookieConsentContext.Provider value={{ status, openSettings }}>
      {children}
      {status === 'unresolved' && (
        <aside className={styles.banner} aria-label="Cookie preferences">
          <div>
            <h2>Your privacy</h2>
            <p>We use essential cookies to make the site work. With your permission, we also send privacy-conscious, first-party analytics to our Supabase database to understand visits and improve the site.</p>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={() => savePreference(true)}>Accept analytics</button>
            <button type="button" className={styles.secondary} onClick={() => savePreference(false)}>Essential only</button>
            <button type="button" className={styles.textButton} onClick={openSettings}>Settings</button>
          </div>
        </aside>
      )}
      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="cookie-settings-title" onCancel={(event) => { event.preventDefault(); setSettingsOpen(false); }}>
        <div className={styles.dialogPanel}>
          <div className={styles.dialogHeader}>
            <h2 id="cookie-settings-title">Cookie settings</h2>
            <button type="button" className={styles.close} aria-label="Close cookie settings" onClick={() => setSettingsOpen(false)}>×</button>
          </div>
          <p className={styles.intro}>Choose whether this site may use optional, first-party analytics. You can revisit this at any time from the footer.</p>
          <section className={styles.category} aria-labelledby="essential-cookies-title">
            <div><h3 id="essential-cookies-title">Essential cookies</h3><p>Always on. These support security, signed-in accounts, the basket and saved site preferences.</p></div>
            <span className={styles.alwaysOn}>Always on</span>
          </section>
          <section className={styles.category} aria-labelledby="analytics-cookies-title">
            <div><h3 id="analytics-cookies-title">Analytics</h3><p>Optional. With consent, we store a persistent anonymous browser identifier in local storage and reuse it if you consent again. Its one-way hash and event details go to our Supabase database. This covers page views, gallery and image interactions, contact submissions, print activity, checkout and payment outcomes, and registrations.</p></div>
            <label className={styles.switch}><input type="checkbox" checked={analyticsEnabled} onChange={(event) => setAnalyticsEnabled(event.target.checked)} /><span>Enable analytics</span></label>
          </section>
          <div className={styles.dialogActions}>
            <button type="button" className={styles.primary} onClick={() => savePreference(analyticsEnabled)}>Save choices</button>
            <Link href="/cookie-policy" className={styles.policyLink}>Cookie Policy</Link>
          </div>
        </div>
      </dialog>
    </CookieConsentContext.Provider>
  );
}
