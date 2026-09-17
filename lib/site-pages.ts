import { createClient } from '@supabase/supabase-js';
import type { NavPage } from '@/types';

/** Addresses the site already uses; a created page can't take them. */
export const RESERVED_SLUGS = new Set([
  'home', 'gallery', 'galleries', 'videography', 'film', 'prints', 'news', 'about', 'contact', 'basket',
  'register', 'portrait-photographer-stockholm', 'admin', 'api', 'auth', 'services', 'sitemap', 'robots', 'favicon', 'opengraph-image', 'images', '_next',
]);

export function slugify(title: string): string {
  return title.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80).replace(/-$/, '');
}

/**
 * Why a slug can't be used, or null when it can. `siblingSlugs` are the other
 * pages at the same level; built-in addresses only matter at the top level.
 */
export function slugProblem(slug: string, siblingSlugs: string[], topLevel = true): string | null {
  if (!slug) return 'Give the page a web address.';
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return 'Use lowercase letters, numbers and single hyphens only.';
  if (topLevel && RESERVED_SLUGS.has(slug)) return `/${slug} is already part of the site. Choose another address.`;
  if (siblingSlugs.includes(slug)) return `Another page here already uses “${slug}”.`;
  return null;
}

/** Published pages marked for the menu, in menu order. Reads without cookies; fails open to none. */
export async function fetchNavPages(): Promise<NavPage[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url?.startsWith('https://') || !key) return [];
  try {
    const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await supabase
      .from('site_pages')
      .select('title, slug')
      .eq('published', true)
      .eq('show_in_nav', true)
      .is('parent_id', null)
      .order('nav_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    console.error('[pages] could not load menu pages:', err);
    return [];
  }
}

export interface PublishedPage {
  page: import('@/types').SitePage;
  parent: Pick<import('@/types').SitePage, 'title' | 'slug'> | null;
  subPages: Pick<import('@/types').SitePage, 'id' | 'title' | 'slug' | 'intro' | 'cover_image' | 'cover_width' | 'cover_height'>[];
}

/**
 * A published page by its address, with its parent (for sub pages) or its
 * published sub pages (for top-level pages). Reads without cookies; a
 * draft parent hides its sub pages too.
 */
export async function fetchPublishedPage(slug: string, parentSlug?: string): Promise<PublishedPage | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const valid = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!url?.startsWith('https://') || !key || !valid.test(slug) || (parentSlug !== undefined && !valid.test(parentSlug))) return null;
  if (parentSlug === undefined && RESERVED_SLUGS.has(slug)) return null;
  try {
    const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    let parent: { id: string; title: string; slug: string } | null = null;
    if (parentSlug !== undefined) {
      const { data } = await supabase.from('site_pages').select('id, title, slug')
        .eq('slug', parentSlug).is('parent_id', null).eq('published', true).maybeSingle();
      if (!data) return null;
      parent = data;
    }
    let query = supabase.from('site_pages').select('*').eq('slug', slug).eq('published', true);
    query = parent?.id ? query.eq('parent_id', parent.id) : query.is('parent_id', null);
    const { data: page, error } = await query.maybeSingle();
    if (error) throw error;
    if (!page) return null;

    const { data: subPages } = parent
      ? { data: [] }
      : await supabase.from('site_pages').select('id, title, slug, intro, cover_image, cover_width, cover_height')
          .eq('parent_id', page.id).eq('published', true).order('nav_order', { ascending: true });

    return { page, parent: parent ? { title: parent.title, slug: parent.slug } : null, subPages: subPages ?? [] };
  } catch (err) {
    console.error(`[pages] could not load /${parentSlug ? `${parentSlug}/` : ''}${slug}:`, err);
    return null;
  }
}
