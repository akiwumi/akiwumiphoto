'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import type { Gallery } from '@/types';

const FLIGHT_EASE = [0.22, 1, 0.36, 1] as const;

const TILE_VARIANTS = {
  hidden: { opacity: 0, y: 22, filter: 'blur(3px)' },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.55,
      ease: FLIGHT_EASE,
      delay: i * 0.07,
    },
  }),
};

interface Props {
  galleries: Gallery[];
}

export default function GalleryCarousel({ galleries }: Props) {
  if (galleries.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div className="border-2 border-grey-mid text-grey-mid text-center p-16" style={{ minWidth: 280 }}>
          <p className="text-sm uppercase tracking-[0.15em]">Coming Soon</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: galleries.length > 3 ? 'repeat(2, 1fr)' : '1fr',
        gap: '8px',
        padding: '0 60px 16px 60px',
      }}
    >
      {galleries.map((gallery, i) => (
        <GalleryTile key={gallery.id} gallery={gallery} priority={i < 3} index={i} />
      ))}
    </div>
  );
}

function GalleryTile({ gallery, priority, index }: { gallery: Gallery; priority?: boolean; index: number }) {
  return (
    <motion.div
      className="motion-card"
      custom={index}
      variants={TILE_VARIANTS}
      initial="hidden"
      animate="visible"
    >
    <Link href={`/gallery/${gallery.slug}`} className="block gallery-tile group cursor-pointer relative overflow-hidden bg-grey-dark" style={{ height: '100%' }}>
      <motion.div
        className="w-full h-full relative"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.985 }}
        transition={{ duration: 0.4, ease: FLIGHT_EASE }}
      >
        {gallery.cover_image ? (
          <Image
            src={gallery.cover_image}
            alt={gallery.title}
            fill
            unoptimized
            sizes="33vw"
            className="object-cover media-zoom"
            priority={priority}
          />
        ) : (
          <div className="absolute inset-0 bg-grey-dark flex items-center justify-center">
            <span className="text-grey-mid text-xs uppercase tracking-[0.15em]">No Image</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent motion-overlay" />

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p
            className="text-white font-bold uppercase text-base"
            style={{ letterSpacing: '0.08em' }}
          >
            {gallery.title}
          </p>
          <div className="tile-accent mt-1" />
        </div>
      </motion.div>
    </Link>
    </motion.div>
  );
}
