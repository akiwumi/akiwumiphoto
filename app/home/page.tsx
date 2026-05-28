import NavBar from '@/components/NavBar';
import GalleryCarousel from '@/components/GalleryCarousel';
import { createServerClient } from '@/lib/supabase-server';
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
    return data || [];
  } catch {
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
      <div className="flex-1 overflow-hidden">
        <GalleryCarousel galleries={galleries} />
      </div>
    </main>
  );
}
