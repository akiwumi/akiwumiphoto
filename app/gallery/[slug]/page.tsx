import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import NavBar from '@/components/NavBar';
import GalleryPageClient from './GalleryPageClient';
import { createServerClient } from '@/lib/supabase-server';
import { signItems, signUrl } from '@/lib/signed-urls';
import type { Gallery, GalleryImage } from '@/types';

interface Props {
  params: Promise<{ slug: string }>;
}

// Chat apps and social sites can fetch the preview image well after the page
// itself, so its signed URL lasts a week rather than the usual hour.
const PREVIEW_IMAGE_TTL_SECONDS = 60 * 60 * 24 * 7;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const supabase = await createServerClient();
    const { data: gallery } = await supabase
      .from('galleries')
      .select('title, description, cover_image')
      .eq('slug', slug)
      .eq('published', true)
      .single();

    if (!gallery) return {};

    const title = `${gallery.title} | Eugene Akiwumi`;
    const description = gallery.description || `${gallery.title}: photography by Eugene Akiwumi, Stockholm.`;
    const cover = await signUrl(gallery.cover_image, PREVIEW_IMAGE_TTL_SECONDS);

    return {
      title,
      description,
      alternates: { canonical: `/gallery/${slug}` },
      openGraph: {
        title,
        description,
        type: 'website',
        url: `/gallery/${slug}`,
        // Without a cover the site-wide preview image applies.
        ...(cover ? { images: [{ url: cover, alt: gallery.title }] } : {}),
      },
    };
  } catch {
    return {};
  }
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

    if (galleryError || !gallery) return null;

    const { data: images, error: imagesError } = await supabase
      .from('gallery_images')
      .select('*')
      .eq('gallery_id', gallery.id)
      .order('sort_order', { ascending: true });

    if (imagesError) return null;

    // Sign all image URLs and the gallery cover so the private bucket serves them
    const [signedImages, signedCover] = await Promise.all([
      signItems(images || []),
      signUrl(gallery.cover_image),
    ]);

    return {
      gallery: { ...gallery, cover_image: signedCover },
      images: signedImages,
    };
  } catch (err) {
    console.error(`[gallery/${slug}] could not load gallery:`, err);
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
      <GalleryPageClient gallery={data.gallery} images={data.images} />
    </main>
  );
}
