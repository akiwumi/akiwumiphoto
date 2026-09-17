import { NextResponse, type NextRequest } from 'next/server';
import { getPrintSizes, getSoldCounts, getSizeExclusions, publicClient } from '@/lib/print-shop';
import { signUrl } from '@/lib/signed-urls';
import type { CatalogImage } from '@/types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_IDS = 50;

/**
 * What the basket needs to show and price its lines: the current size options
 * and, for each requested photograph, its details and sold counts. Photographs
 * that no longer exist are simply absent.
 *
 * Prints held by another buyer who is paying count as sold here, so the
 * basket doesn't offer what checkout would refuse.
 */
export async function GET(request: NextRequest) {
  const ids = [...new Set((request.nextUrl.searchParams.get('ids') ?? '').split(','))]
    .filter((id) => UUID.test(id))
    .slice(0, MAX_IDS);

  const sizes = await getPrintSizes();
  if (ids.length === 0) return NextResponse.json({ sizes, images: [], sold: {}, unavailableSizes: {} });

  try {
    const supabase = publicClient();
    const { data: rows, error } = await supabase
      .from('gallery_images')
      .select('id, gallery_id, storage_path, title, for_sale, galleries!inner(title, slug, published)')
      .in('id', ids);
    if (error) throw error;

    // Positions count every image in the gallery, in the order the page shows.
    const galleryIds = [...new Set((rows ?? []).map((row) => row.gallery_id))];
    const { data: siblings, error: siblingsError } = galleryIds.length
      ? await supabase
          .from('gallery_images')
          .select('id, gallery_id')
          .in('gallery_id', galleryIds)
          .order('sort_order', { ascending: true })
      : { data: [], error: null };
    if (siblingsError) throw siblingsError;

    const positions = new Map<string, number>();
    const counters = new Map<string, number>();
    for (const sibling of siblings ?? []) {
      const next = (counters.get(sibling.gallery_id) ?? 0) + 1;
      counters.set(sibling.gallery_id, next);
      positions.set(sibling.id, next);
    }

    const [images, sold, unavailableSizes] = await Promise.all([
      Promise.all((rows ?? []).map(async (row): Promise<CatalogImage> => {
        // A to-one embed; typed loosely by supabase-js.
        const gallery = row.galleries as unknown as { title: string; slug: string; published: boolean };
        return {
          id: row.id,
          galleryTitle: gallery.title,
          gallerySlug: gallery.slug,
          title: row.title,
          position: positions.get(row.id) ?? 1,
          thumbnail: await signUrl(row.storage_path),
          forSale: gallery.published && row.for_sale !== false,
        };
      })),
      getSoldCounts(ids),
      getSizeExclusions(ids),
    ]);

    const { data: held, error: heldError } = await supabase.rpc('held_print_counts', { p_image_ids: ids });
    if (heldError) console.error('[prints/catalog] could not load held prints:', heldError);
    for (const row of (held ?? []) as { image_id: string; size_id: string; held: number }[]) {
      const counts = (sold[row.image_id] ??= {});
      counts[row.size_id] = (counts[row.size_id] ?? 0) + row.held;
    }

    return NextResponse.json({ sizes, images, sold, unavailableSizes });
  } catch (err) {
    console.error('[prints/catalog] could not load basket details:', err);
    return NextResponse.json({ error: 'The basket could not be loaded.' }, { status: 500 });
  }
}
