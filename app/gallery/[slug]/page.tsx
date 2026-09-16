import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import NavBar from '@/components/NavBar';
import GalleryPageClient from './GalleryPageClient';
import { createServerClient } from '@/lib/supabase-server';
import { signItems, signUrl } from '@/lib/signed-urls';
import { getPrintSizes, getSoldCounts } from '@/lib/print-shop';
import type { Gallery, GalleryImage, GallerySection, GallerySectionImage, PrintSize, SoldBySize } from '@/types';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sub?: string | string[] }>;
}

function subParam(value: string | string[] | undefined): string | null {
  return typeof value === 'string' && value ? value : null;
}

// Chat apps and social sites can fetch the preview image well after the page
// itself, so its signed URL lasts a week rather than the usual hour.
const PREVIEW_IMAGE_TTL_SECONDS = 60 * 60 * 24 * 7;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sub = subParam((await searchParams).sub);

  try {
    const supabase = await createServerClient();
    const { data: gallery } = await supabase
      .from('galleries')
      .select('id, title, description, cover_image')
      .eq('slug', slug)
      .eq('published', true)
      .single();

    if (!gallery) return {};

    // A shared sub-gallery link previews with its own name and cover.
    let section: { title: string; cover: string | null } | null = null;
    if (sub) {
      const { data: row } = await supabase
        .from('gallery_sections')
        .select('id, title, cover_image_id')
        .eq('gallery_id', gallery.id)
        .eq('slug', sub)
        .maybeSingle();
      if (row) {
        const { data: members } = await supabase
          .from('gallery_section_images')
          .select('image_id, sort_order, gallery_images(storage_path)')
          .eq('section_id', row.id)
          .order('sort_order', { ascending: true });
        const paths = (members ?? []).map((m) => ({
          id: m.image_id,
          path: (m.gallery_images as unknown as { storage_path: string } | null)?.storage_path ?? null,
        }));
        const cover = paths.find((p) => p.id === row.cover_image_id) ?? paths[0];
        section = { title: row.title, cover: cover?.path ?? null };
      }
    }

    const name = section ? `${section.title} — ${gallery.title}` : gallery.title;
    const title = `${name} | Eugene Akiwumi`;
    const description = gallery.description || `${name}: photography by Eugene Akiwumi, Stockholm.`;
    const url = section ? `/gallery/${slug}?sub=${sub}` : `/gallery/${slug}`;
    const cover = await signUrl(section?.cover ?? gallery.cover_image, PREVIEW_IMAGE_TTL_SECONDS);

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        title,
        description,
        type: 'website',
        url,
        // Without a cover the site-wide preview image applies.
        ...(cover ? { images: [{ url: cover, alt: name }] } : {}),
      },
    };
  } catch {
    return {};
  }
}

interface GalleryData {
  gallery: Gallery;
  images: GalleryImage[];
  sizes: PrintSize[];
  sold: Record<string, SoldBySize>;
  sections: GallerySection[];
  memberships: GallerySectionImage[];
}

async function getGalleryData(slug: string): Promise<GalleryData | null> {
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

    const { data: sections } = await supabase
      .from('gallery_sections')
      .select('id, gallery_id, title, slug, cover_image_id, sort_order')
      .eq('gallery_id', gallery.id)
      .order('sort_order', { ascending: true });
    const { data: memberships } = sections?.length
      ? await supabase
          .from('gallery_section_images')
          .select('section_id, image_id, sort_order')
          .in('section_id', sections.map((section) => section.id))
      : { data: [] };

    // Sign all image URLs and the gallery cover so the private bucket serves
    // them, alongside what the print shop needs to sell each photograph.
    const [signedImages, signedCover, sizes, sold] = await Promise.all([
      signItems(images || []),
      signUrl(gallery.cover_image),
      getPrintSizes(),
      getSoldCounts((images || []).map((image) => image.id)),
    ]);

    return {
      gallery: { ...gallery, cover_image: signedCover },
      images: signedImages,
      sizes,
      sold,
      sections: sections ?? [],
      memberships: memberships ?? [],
    };
  } catch (err) {
    console.error(`[gallery/${slug}] could not load gallery:`, err);
    return null;
  }
}

export default async function GalleryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const initialSub = subParam((await searchParams).sub);
  const data = await getGalleryData(slug);

  if (!data) notFound();

  return (
    <main className="full-screen bg-black flex flex-col overflow-hidden">
      <NavBar />
      <GalleryPageClient
        gallery={data.gallery}
        images={data.images}
        sizes={data.sizes}
        sold={data.sold}
        sections={data.sections}
        memberships={data.memberships}
        initialSub={initialSub}
      />
    </main>
  );
}
