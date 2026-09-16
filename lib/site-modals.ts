import type { ModalFrequency, SiteModal } from '@/types';

/** At most this many modals show on one page, one after another. */
export const MAX_MODALS_PER_PAGE = 3;

/** Pages a modal can open on, keyed as stored in site_modals.pages. */
export const SITE_PAGES: { key: string; label: string; matches: (path: string) => boolean }[] = [
  { key: 'landing', label: 'Landing page', matches: (p) => p === '/' },
  { key: 'galleries', label: 'Gallery index', matches: (p) => p === '/home' },
  { key: 'gallery', label: 'Individual galleries', matches: (p) => p.startsWith('/gallery/') },
  { key: 'videography', label: 'Film', matches: (p) => p === '/videography' },
  { key: 'prints', label: 'Prints', matches: (p) => p === '/prints' },
  { key: 'about', label: 'About', matches: (p) => p === '/about' },
  { key: 'contact', label: 'Contact', matches: (p) => p === '/contact' },
  { key: 'basket', label: 'Basket', matches: (p) => p === '/basket' },
  { key: 'news', label: 'News', matches: (p) => p === '/news' },
  // Anything else one or two segments deep is a page (or sub page) made in the admin; built-in routes match above.
  { key: 'created', label: 'Pages you created', matches: (p) => /^\/[a-z0-9]+(-[a-z0-9]+)*(\/[a-z0-9]+(-[a-z0-9]+)*)?$/.test(p) && !['/register', '/home'].includes(p) && !p.startsWith('/register/') },
];

export const FREQUENCIES: { value: ModalFrequency; label: string; hint: string }[] = [
  { value: 'once_per_session', label: 'Once per visit', hint: 'Again when the visitor comes back another day.' },
  { value: 'once', label: 'Only once', hint: 'Never again in that browser after it is closed.' },
  { value: 'every_view', label: 'Every page view', hint: 'Each time a matching page loads.' },
];

export function targetsPage(modal: Pick<SiteModal, 'pages'>, key: string): boolean {
  return modal.pages.includes('all') || modal.pages.includes(key);
}

export function pageKeyFor(pathname: string): string | null {
  return SITE_PAGES.find((page) => page.matches(pathname))?.key ?? null;
}

/** Inside its start and end dates (either may be open). */
export function isScheduledNow(modal: Pick<SiteModal, 'starts_at' | 'ends_at'>, now = Date.now()): boolean {
  if (modal.starts_at && Date.parse(modal.starts_at) > now) return false;
  if (modal.ends_at && Date.parse(modal.ends_at) <= now) return false;
  return true;
}

/** The modals that open on a path, in order, capped at MAX_MODALS_PER_PAGE. */
export function modalsForPath(modals: SiteModal[], pathname: string, now = Date.now()): SiteModal[] {
  const key = pageKeyFor(pathname);
  if (!key) return [];
  return modals
    .filter((m) => m.active && isScheduledNow(m, now) && targetsPage(m, key))
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, MAX_MODALS_PER_PAGE);
}

/**
 * Pages where saving `candidate` as active would put more than
 * MAX_MODALS_PER_PAGE active modals. Scheduling is ignored: two modals with
 * separate dates still count, which keeps the rule easy to reason about.
 */
export function overfullPages(modals: SiteModal[], candidate: Pick<SiteModal, 'id' | 'pages' | 'active'>): string[] {
  if (!candidate.active) return [];
  const others = modals.filter((m) => m.active && m.id !== candidate.id);
  return SITE_PAGES
    .filter((page) => targetsPage(candidate, page.key))
    .filter((page) => others.filter((m) => targetsPage(m, page.key)).length >= MAX_MODALS_PER_PAGE)
    .map((page) => page.label);
}

/** Paragraphs of admin-written text, split on blank lines. */
export function paragraphs(body: string): string[] {
  return body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}
