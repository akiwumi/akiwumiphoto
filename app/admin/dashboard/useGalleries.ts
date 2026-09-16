'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { extractStoragePath } from '@/lib/storage-utils';
import { DEMO_GALLERIES, DEMO_IMAGES } from '@/lib/demo-data';
import type { Gallery } from '@/types';

const PLACEHOLDER = ['your-project', 'your-anon'];
export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return url.startsWith('https://') && !PLACEHOLDER.some((p) => url.includes(p)) && key.length > 20;
}

const DEMO_STORAGE_KEY = 'akiwumi-admin-demo-galleries';
export function readDemoGalleries(): Gallery[] {
  if (typeof window === 'undefined') return DEMO_GALLERIES;
  try {
    const saved = window.localStorage.getItem(DEMO_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as Gallery[]) : DEMO_GALLERIES;
  } catch { return DEMO_GALLERIES; }
}
export function writeDemoGalleries(galleries: Gallery[]) {
  if (typeof window !== 'undefined') window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(galleries));
}

/**
 * The gallery list the admin sidebar and overview share: order, covers and
 * photo counts. Order is the gallery page's order (galleries.sort_order).
 */
export function useGalleries() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [photoCounts, setPhotoCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [error, setError] = useState('');

  const loadDemo = useCallback(() => {
    const demo = readDemoGalleries();
    setGalleries(demo);
    setCovers(Object.fromEntries(demo.filter((g) => g.cover_image).map((g) => [g.id, g.cover_image!])));
    setPhotoCounts(Object.fromEntries(demo.map((g) => [g.id, DEMO_IMAGES[g.id]?.length ?? 0])));
    setIsDemoMode(true);
  }, []);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) { loadDemo(); setLoading(false); return; }
    try {
      const [{ data, error: galleryError }, { data: imageRows }] = await Promise.all([
        supabase.from('galleries').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
        supabase.from('gallery_images').select('gallery_id'),
      ]);
      if (galleryError) throw galleryError;
      const rows = (data ?? []) as Gallery[];
      setGalleries(rows);
      setIsDemoMode(false);

      const counts: Record<string, number> = {};
      (imageRows ?? []).forEach((row: { gallery_id: string }) => { counts[row.gallery_id] = (counts[row.gallery_id] ?? 0) + 1; });
      setPhotoCounts(counts);

      const withCover = rows.filter((g) => g.cover_image);
      const paths = withCover.map((g) => extractStoragePath(g.cover_image!, 'gallery-images'));
      if (paths.length) {
        const { data: signed } = await supabase.storage.from('gallery-images').createSignedUrls(paths, 3600);
        const next: Record<string, string> = {};
        withCover.forEach((g, i) => { if (signed?.[i]?.signedUrl) next[g.id] = signed[i].signedUrl; });
        setCovers(next);
      }
    } catch {
      loadDemo();
    }
    setLoading(false);
  }, [loadDemo]);

  useEffect(() => { refresh(); }, [refresh]);

  /** Saves a new order; the gallery page follows it on its next load. */
  const reorder = useCallback(async (next: Gallery[]) => {
    const ordered = next.map((g, i) => ({ ...g, sort_order: i }));
    const previous = galleries;
    setGalleries(ordered);
    setError('');
    if (isDemoMode) { writeDemoGalleries(ordered); return; }
    const results = await Promise.all(
      ordered.map((g) => supabase.from('galleries').update({ sort_order: g.sort_order }).eq('id', g.id)),
    );
    const failed = results.find((r) => r.error)?.error;
    if (failed) {
      setGalleries(previous);
      setError(`Could not save the new order: ${failed.message}`);
    }
  }, [galleries, isDemoMode]);

  const create = useCallback(async (): Promise<string | null> => {
    const now = new Date().toISOString();
    if (isDemoMode) {
      const created: Gallery = { id: `demo-${Date.now()}`, title: 'New Gallery', slug: `gallery-${Date.now()}`, description: '', cover_image: null, sort_order: galleries.length, published: true, created_at: now, updated_at: now };
      const next = [...galleries, created];
      writeDemoGalleries(next); setGalleries(next);
      return created.id;
    }
    const { data, error: insertError } = await supabase
      .from('galleries')
      .insert({ title: 'New Gallery', slug: `gallery-${Date.now()}`, sort_order: galleries.length, published: true })
      .select()
      .single();
    if (insertError || !data) { setError(`Could not create a gallery: ${insertError?.message ?? 'unknown error'}`); return null; }
    await refresh();
    return data.id;
  }, [galleries, isDemoMode, refresh]);

  const setPublished = useCallback(async (id: string, published: boolean) => {
    setGalleries((prev) => prev.map((g) => (g.id === id ? { ...g, published } : g)));
    if (isDemoMode) { writeDemoGalleries(readDemoGalleries().map((g) => (g.id === id ? { ...g, published } : g))); return; }
    const { error: updateError } = await supabase.from('galleries').update({ published }).eq('id', id);
    if (updateError) { setError(`Could not update: ${updateError.message}`); refresh(); }
  }, [isDemoMode, refresh]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    if (!confirm('Delete this gallery and all its images? This cannot be undone.')) return false;
    if (isDemoMode) {
      const next = galleries.filter((g) => g.id !== id).map((g, i) => ({ ...g, sort_order: i }));
      writeDemoGalleries(next); setGalleries(next);
      return true;
    }
    await supabase.from('gallery_images').delete().eq('gallery_id', id);
    const { error: deleteError } = await supabase.from('galleries').delete().eq('id', id);
    if (deleteError) { setError(`Could not delete: ${deleteError.message}`); return false; }
    await refresh();
    return true;
  }, [galleries, isDemoMode, refresh]);

  const seedDemo = useCallback(async () => {
    if (!isSupabaseConfigured()) { alert('Configure Supabase credentials in .env.local first.'); return; }
    if (!confirm('Seed all 6 demo galleries into Supabase? This will create them as real editable galleries.')) return;
    for (const g of DEMO_GALLERIES) {
      const { data: created } = await supabase
        .from('galleries')
        .insert({ title: g.title, slug: g.slug, description: g.description, cover_image: g.cover_image, sort_order: g.sort_order, published: g.published })
        .select()
        .single();
      if (!created) continue;
      for (const img of DEMO_IMAGES[g.id] || []) {
        await supabase.from('gallery_images').insert({
          gallery_id: created.id, storage_path: img.storage_path, title: img.title, description: img.description, sort_order: img.sort_order,
        });
      }
    }
    await refresh();
  }, [refresh]);

  return { galleries, covers, photoCounts, loading, isDemoMode, error, setError, refresh, reorder, create, setPublished, remove, seedDemo };
}

export type GalleriesState = ReturnType<typeof useGalleries>;
