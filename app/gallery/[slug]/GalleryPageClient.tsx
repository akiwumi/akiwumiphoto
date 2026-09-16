'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import Lightbox from '@/components/Lightbox';
import TileBasketButton from '@/components/TileBasketButton';
import NotForSaleStamp from '@/components/NotForSaleStamp';
import { defaultSize } from '@/lib/print-availability';
import { sectionCover, sectionImages } from '@/lib/sub-galleries';
import type { Gallery, GalleryImage, GallerySection, GallerySectionImage, PrintSize, SoldBySize } from '@/types';

interface Props {
  gallery: Gallery;
  images: GalleryImage[];
  sizes: PrintSize[];
  sold: Record<string, SoldBySize>;
  sections: GallerySection[];
  memberships: GallerySectionImage[];
  /** The ?sub= the page was opened with. */
  initialSub: string | null;
}

/**
 * A gallery with optional sub-galleries. The main view shows a card for each
 * sub-gallery, then the photographs in none of them; choosing a sub-gallery
 * (card or filter button) shows its photographs. The choice lives in ?sub=
 * so a sub-gallery can be shared, and switching doesn't reload the page.
 */
export default function GalleryPageClient({ gallery, images, sizes, sold, sections, memberships, initialSub }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(initialSub);

  // Sub-galleries with no photographs are left out entirely.
  const groups = useMemo(() => sections
    .map((section) => ({ section, members: sectionImages(section, images, memberships) }))
    .filter((group) => group.members.length > 0), [sections, images, memberships]);

  const active = groups.find((group) => group.section.slug === activeSlug) ?? null;
  const grouped = useMemo(() => new Set(groups.flatMap((group) => group.members.map((m) => m.id))), [groups]);
  const tiles = active ? active.members : images.filter((image) => !grouped.has(image.id));

  // Back and forward move between sub-galleries.
  useEffect(() => {
    const onPopState = () => {
      setActiveSlug(new URLSearchParams(window.location.search).get('sub'));
      setLightboxIndex(null);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const choose = (slug: string | null) => {
    setActiveSlug(slug);
    setLightboxIndex(null);
    window.history.pushState(null, '', slug ? `?sub=${encodeURIComponent(slug)}` : window.location.pathname);
  };

  return (
    <>
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Header — aligned to the same 60px inset as the gallery grid */}
        <div className="site-page-heading" style={{ padding: '14px 60px 10px' }}>
          <Link
            href="/home"
            className="text-grey-mid text-xs uppercase tracking-[0.15em] hover:text-red transition-colors flex items-center gap-1 mb-3"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <polyline points="15,18 9,12 15,6" />
            </svg>
            Gallery / {gallery.title}
          </Link>

          <h1
            className="text-white font-bold uppercase leading-none mb-2"
            style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', letterSpacing: '0.08em' }}
          >
            {gallery.title}
          </h1>

          {gallery.description && (
            <p className="text-grey-mid text-base mb-3 max-w-2xl line-clamp-1">{gallery.description}</p>
          )}

          <div className="red-rule" />

          {groups.length > 0 && (
            <nav className="sub-gallery-filters" aria-label="Sub-galleries">
              <button type="button" aria-pressed={!active} onClick={() => choose(null)}>All</button>
              {groups.map(({ section }) => (
                <button
                  key={section.id}
                  type="button"
                  aria-pressed={active?.section.id === section.id}
                  onClick={() => choose(section.slug)}
                >
                  {section.title}
                </button>
              ))}
            </nav>
          )}
        </div>

        {/* Image grid — 3 columns, 60px side insets, matching home page */}
        {tiles.length > 0 || (!active && groups.length > 0) ? (
          <div
            className="site-media-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              padding: '8px 60px 60px',
            }}
          >
            {!active && groups.map(({ section, members }) => (
              <SubGalleryCard
                key={section.id}
                section={section}
                cover={sectionCover(section, members)}
                count={members.length}
                onOpen={() => choose(section.slug)}
              />
            ))}
            {tiles.map((image, i) => (
              <ImageTile
                key={image.id}
                image={image}
                priority={i < 3}
                index={i}
                basketSize={image.for_sale === false ? undefined : defaultSize(sizes, sold[image.id])}
                onClick={() => setLightboxIndex(i)}
              />
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-grey-mid text-sm uppercase tracking-[0.15em]">No images yet</p>
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          images={tiles}
          initialIndex={lightboxIndex}
          galleryTitle={gallery.title}
          sizes={sizes}
          sold={sold}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}

function SubGalleryCard({ section, cover, count, onOpen }: {
  section: GallerySection;
  cover: GalleryImage | undefined;
  count: number;
  onOpen: () => void;
}) {
  return (
    <a
      href={`?sub=${encodeURIComponent(section.slug)}`}
      className="sub-gallery-card"
      onClick={(e) => {
        // A real link, so it opens in a new tab too; here it switches in place.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        onOpen();
      }}
    >
      {cover?.storage_path && (
        <Image src={cover.storage_path} alt="" fill unoptimized draggable={false} className="object-cover media-zoom" sizes="33vw" />
      )}
      <div className="img-shield" aria-hidden="true" />
      <div className="sub-gallery-card-caption">
        <span className="sub-gallery-card-title">{section.title}</span>
        <span className="sub-gallery-card-count">{count} {count === 1 ? 'photograph' : 'photographs'}</span>
      </div>
    </a>
  );
}

interface TileProps {
  image: GalleryImage;
  priority?: boolean;
  index: number;
  /** The size a one-click add uses; absent when the photo can't be bought. */
  basketSize?: PrintSize;
  onClick: () => void;
}

function ImageTile({ image, priority, index, basketSize, onClick }: TileProps) {
  return (
    <motion.div
      className="gallery-tile group relative overflow-hidden bg-grey-dark cursor-pointer"
      style={{ aspectRatio: '4/5' }}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.985 }}
      transition={{
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1],
        delay: (index % 3) * 0.04,
      }}
      onClick={onClick}
    >
      {image.storage_path && (
        <Image
          src={image.storage_path}
          alt={image.title || 'Gallery image'}
          fill
          unoptimized
          draggable={false}
          className="object-cover media-zoom"
          sizes="33vw"
          priority={priority}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent motion-overlay" />
      <div className="img-shield" onContextMenu={(e) => e.preventDefault()} />
      {basketSize && <TileBasketButton imageId={image.id} size={basketSize} />}
      {image.for_sale === false && <NotForSaleStamp raised={Boolean(image.title || image.description)} />}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        {image.title && (
          <p className="text-white font-bold text-sm uppercase" style={{ letterSpacing: '0.08em' }}>
            {image.title}
          </p>
        )}
        {image.description && (
          <p className="text-white/70 text-xs mt-0.5 line-clamp-1">{image.description}</p>
        )}
        <div className="tile-accent mt-1" />
      </div>
    </motion.div>
  );
}
