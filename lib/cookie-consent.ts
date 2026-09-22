export const COOKIE_CONSENT_STORAGE_KEY = 'akiwumi-cookie-consent-v1';
export const COOKIE_CONSENT_MAX_AGE_MS = 183 * 24 * 60 * 60 * 1000;

export type ConsentStatus = 'accepted' | 'rejected' | 'unresolved';

type StoredConsent = {
  analytics: boolean;
  decidedAt: number;
};

export function parseConsentPreference(value: string | null, now = Date.now()): ConsentStatus {
  if (!value) return 'unresolved';

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return 'unresolved';

    const { analytics, decidedAt } = parsed as Partial<StoredConsent>;
    if (typeof analytics !== 'boolean' || typeof decidedAt !== 'number' || !Number.isFinite(decidedAt)) return 'unresolved';
    if (decidedAt > now || now - decidedAt >= COOKIE_CONSENT_MAX_AGE_MS) return 'unresolved';

    return analytics ? 'accepted' : 'rejected';
  } catch {
    return 'unresolved';
  }
}

export function getConsentStatus(storage: Pick<Storage, 'getItem'> | null): ConsentStatus {
  try {
    return parseConsentPreference(storage?.getItem(COOKIE_CONSENT_STORAGE_KEY) ?? null);
  } catch {
    return 'unresolved';
  }
}

