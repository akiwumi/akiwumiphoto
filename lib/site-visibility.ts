import { createClient } from '@supabase/supabase-js';

/**
 * Public pages the admin can hide. A hidden page leaves the menu, footer and
 * sitemap, and its address answers 404 (enforced in proxy.ts). The landing
 * page can't be hidden. Stored in page_content as page 'site', key
 * 'hidden_pages', a JSON array of these keys.
 */
export const HIDEABLE_PAGES: { key: string; label: string; href: string; description: string; matches: (path: string) => boolean }[] = [
  { key: 'gallery', label: 'Gallery', href: '/home', description: 'The gallery index and every gallery', matches: (p) => p === '/home' || p.startsWith('/gallery/') },
  { key: 'videography', label: 'Film', href: '/videography', description: 'Your films', matches: (p) => p === '/videography' },
  { key: 'services', label: 'Services', href: '/#services', description: 'The services section on the landing page', matches: () => false },
  { key: 'prints', label: 'Prints', href: '/prints', description: 'Print sizes and prices', matches: (p) => p === '/prints' },
  { key: 'news', label: 'News', href: '/news', description: 'Announcements from your modals', matches: (p) => p === '/news' },
  { key: 'about', label: 'About', href: '/about', description: 'Your biography and portrait', matches: (p) => p === '/about' },
  { key: 'contact', label: 'Contact', href: '/contact', description: 'The enquiry form', matches: (p) => p === '/contact' },
  { key: 'basket', label: 'Basket', href: '/basket', description: 'The print basket', matches: (p) => p === '/basket' },
];

export const VISIBILITY_ROW = { page: 'site', key: 'hidden_pages' } as const;

export function parseHiddenPages(value: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(value ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((k): k is string => HIDEABLE_PAGES.some((p) => p.key === k)) : [];
  } catch {
    return [];
  }
}

/** The hidden page whose address this is, if any. */
export function hiddenPageFor(pathname: string, hidden: string[]): string | null {
  return HIDEABLE_PAGES.find((p) => hidden.includes(p.key) && p.matches(pathname))?.key ?? null;
}

/** Reads the list without cookies, so any server code (and the proxy) can call it. Fails open: nothing hidden. */
export async function fetchHiddenPages(): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url?.startsWith('https://') || !key) return [];
  try {
    const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await supabase
      .from('page_content')
      .select('value')
      .eq('page', VISIBILITY_ROW.page)
      .eq('key', VISIBILITY_ROW.key)
      .maybeSingle();
    if (error) throw error;
    return parseHiddenPages(data?.value);
  } catch (err) {
    console.error('[visibility] could not load hidden pages:', err);
    return [];
  }
}
