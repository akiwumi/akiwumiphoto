import type { Metadata } from 'next';
import NavBar from '@/components/NavBar';
import GalleryCarousel from '@/components/GalleryCarousel';
import { createServerClient } from '@/lib/supabase-server';
import { signUrl } from '@/lib/signed-urls';
import type { Gallery } from '@/types';

export const metadata: Metadata = {
  title: 'Photography Portfolio | Eugene Akiwumi, Stockholm',
  description: 'Portrait, documentary, street and landscape photography by Stockholm-based photographer Eugene Akiwumi.',
  alternates: { canonical: '/home' },
};

async function getGalleries(): Promise<Gallery[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('galleries')
      .select('id, title, slug, description, cover_image, sort_order, published, created_at, updated_at')
      .eq('published', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

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
      <div className="site-page-heading"><h1>Gallery</h1><p>Photography by Eugene Akiwumi.</p></div>
      <div className="gallery-feed-scroll flex-1 overflow-y-auto">
        <GalleryCarousel galleries={galleries} />
      </div>
    </main>
  );
}
