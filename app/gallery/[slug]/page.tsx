import { notFound } from 'next/navigation';
import NavBar from '@/components/NavBar';
import GalleryPageClient from './GalleryPageClient';
import { createServerClient } from '@/lib/supabase-server';
import { getDemoGalleryBySlug, getDemoImagesForGallery } from '@/lib/demo-data';
import type { Gallery, GalleryImage } from '@/types';

interface Props {
  params: Promise<{ slug: string }>;
}

async function getGalleryData(slug: string): Promise<{ gallery: Gallery; images: GalleryImage[] } | null> {
  try {
    const supabase = await createServerClient();

    const { data: gallery, error: galleryError } = await supabase
      .from('galleries')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .single();

    if (galleryError || !gallery) {
      const demoGallery = getDemoGalleryBySlug(slug);
      if (demoGallery) return { gallery: demoGallery, images: getDemoImagesForGallery(demoGallery.id) };
      return null;
    }

    const { data: images, error: imagesError } = await supabase
      .from('gallery_images')
      .select('*')
      .eq('gallery_id', gallery.id)
      .order('sort_order', { ascending: true });

    if (imagesError) return null;

    return { gallery, images: images || [] };
  } catch {
    const demoGallery = getDemoGalleryBySlug(slug);
    if (demoGallery) return { gallery: demoGallery, images: getDemoImagesForGallery(demoGallery.id) };
    return null;
  }
}

export default async function GalleryPage({ params }: Props) {
  const { slug } = await params;
  const data = await getGalleryData(slug);

  if (!data) notFound();

  return (
    <main className="full-screen bg-black flex flex-col overflow-hidden">
      <NavBar />
      <div style={{ height: 48, flexShrink: 0 }} />
      <GalleryPageClient gallery={data.gallery} images={data.images} />
    </main>
  );
}
