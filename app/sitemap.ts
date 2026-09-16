import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { SITE_URL } from '@/lib/site-origin';
import { HIDEABLE_PAGES, fetchHiddenPages } from '@/lib/site-visibility';

// Regenerated at most hourly, so a newly published gallery reaches the
// sitemap without waiting for a redeploy.
export const revalidate = 3600;

const STATIC_PAGES: { path: string; priority: number }[] = [
  { path: '', priority: 1 },
  { path: '/home', priority: 0.9 },
  { path: '/prints', priority: 0.9 },
  { path: '/videography', priority: 0.8 },
  { path: '/news', priority: 0.6 },
  { path: '/about', priority: 0.7 },
  { path: '/contact', priority: 0.7 },
  { path: '/register', priority: 0.3 },
];

/** Published pages made in the admin. */
async function publishedPages(): Promise<{ path: string; updated_at: string }[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await supabase.from('site_pages').select('id, parent_id, slug, updated_at').eq('published', true);
    if (error) throw error;
    const rows = data ?? [];
    // A sub page is only reachable while its parent is published too.
    return rows.flatMap((row) => {
      if (!row.parent_id) return [{ path: `/${row.slug}`, updated_at: row.updated_at }];
      const parent = rows.find((p) => p.id === row.parent_id);
      return parent ? [{ path: `/${parent.slug}/${row.slug}`, updated_at: row.updated_at }] : [];
    });
  } catch (err) {
    console.error('[sitemap] could not load pages:', err);
    return [];
  }
}

/** Published galleries only. A failed lookup still yields the fixed pages. */
async function publishedGalleries(): Promise<{ slug: string; updated_at: string }[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];

  try {
    const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await supabase
      .from('galleries')
      .select('slug, updated_at')
      .eq('published', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    console.error('[sitemap] could not load galleries:', err);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [galleries, hidden, pages] = await Promise.all([publishedGalleries(), fetchHiddenPages(), publishedPages()]);
  const isHidden = (path: string) => HIDEABLE_PAGES.some((page) => hidden.includes(page.key) && page.matches(path));

  return [
    ...STATIC_PAGES.filter(({ path }) => !isHidden(path)).map(({ path, priority }) => ({
      url: `${SITE_URL}${path}`,
      priority,
    })),
    ...galleries.filter((gallery) => !isHidden(`/gallery/${gallery.slug}`)).map((gallery) => ({
      url: `${SITE_URL}/gallery/${gallery.slug}`,
      lastModified: new Date(gallery.updated_at),
      priority: 0.8,
    })),
    ...pages.map((page) => ({
      url: `${SITE_URL}${page.path}`,
      lastModified: new Date(page.updated_at),
      priority: 0.6,
    })),
  ];
}
