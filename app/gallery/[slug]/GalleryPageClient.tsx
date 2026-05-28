'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import Lightbox from '@/components/Lightbox';
import type { Gallery, GalleryImage } from '@/types';

interface Props {
  gallery: Gallery;
  images: GalleryImage[];
}

export default function GalleryPageClient({ gallery, images }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Header — aligned to the same 60px inset as the gallery grid */}
        <div style={{ padding: '14px 60px 10px' }}>
          <Link
            href="/home"
            className="text-grey-mid text-xs uppercase tracking-[0.15em] hover:text-red transition-colors flex items-center gap-1 mb-3"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <polyline points="15,18 9,12 15,6" />
            </svg>
            HOME / {gallery.title.toUpperCase()}
          </Link>

          <h1
            className="text-white font-bold uppercase leading-none mb-2"
            style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', letterSpacing: '0.08em' }}
          >
            {gallery.title}
          </h1>

          {gallery.description && (
            <p className="text-grey-mid text-sm mb-3 max-w-2xl line-clamp-1">{gallery.description}</p>
          )}

          <div className="red-rule" />
        </div>

        {/* Image grid — 3 columns, 60px side insets, matching home page */}
        {images.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              padding: '8px 60px 60px',
            }}
          >
            {images.map((image, i) => (
              <ImageTile
                key={image.id}
                image={image}
                priority={i < 3}
                index={i}
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
          images={images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}

function ImageTile({ image, priority, index, onClick }: { image: GalleryImage; priority?: boolean; index: number; onClick: () => void }) {
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
          className="object-cover media-zoom"
          sizes="33vw"
          priority={priority}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent motion-overlay" />
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
