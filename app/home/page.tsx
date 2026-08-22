import NavBar from '@/components/NavBar';
import GalleryCarousel from '@/components/GalleryCarousel';
import { createServerClient } from '@/lib/supabase-server';
import { signUrl } from '@/lib/signed-urls';
import type { Gallery } from '@/types';

async function getGalleries(): Promise<Gallery[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('galleries')
      .select('id, title, slug, description, cover_image, sort_order, published, created_at, updated_at')
      .eq('published', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    const galleries = data || [];

    // Sign cover image URLs so the private bucket serves them
    return await Promise.all(
      galleries.map(async (g) => ({
        ...g,
        cover_image: g.cover_image ? await signUrl(g.cover_image) : null,
      }))
    );
  } catch (err) {
    console.error('[home] could not load galleries:', err);
    return [];
  }
}

export default async function HomePage() {
  const galleries = await getGalleries();

  return (
    <main className="full-screen bg-black flex flex-col overflow-hidden">
      <NavBar />
      {/* spacer pushes content below the fixed nav */}
      <div style={{ height: 48, flexShrink: 0 }} />
      <div className="gallery-feed-scroll flex-1 overflow-y-auto">
        <GalleryCarousel galleries={galleries} />
      </div>
    </main>
  );
}
