'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import VideoModal from '@/components/VideoModal';
import type { Video } from '@/types';

interface Props {
  videos: Video[];
}

export default function VideographyClient({ videos }: Props) {
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);

  return (
    <>
      <div className="flex-1 flex flex-col overflow-y-auto page-enter">
        {/* Header */}
        <div style={{ padding: '14px 60px 10px' }}>
          <h1
            className="text-white font-bold uppercase leading-none mb-2"
            style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', letterSpacing: '0.08em' }}
          >
            VIDEOGRAPHY
          </h1>
          <div className="red-rule" />
        </div>

        {/* Grid */}
        {videos.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              padding: '8px 60px 60px',
            }}
          >
            {videos.map((video, i) => (
              <VideoCard
                key={video.id}
                video={video}
                priority={i < 3}
                index={i}
                onClick={() => setActiveVideo(video)}
              />
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-grey-mid text-sm uppercase tracking-[0.15em]">No videos yet</p>
          </div>
        )}
      </div>

      {activeVideo && (
        <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />
      )}
    </>
  );
}

function VideoCard({ video, priority, index, onClick }: { video: Video; priority?: boolean; index: number; onClick: () => void }) {
  return (
    <motion.div
      className="group cursor-pointer motion-card"
      initial={{ opacity: 0, y: 22, filter: 'blur(3px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-50px' }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.985 }}
      transition={{
        duration: 0.55,
        ease: [0.22, 1, 0.36, 1],
        delay: (index % 3) * 0.07,
      }}
      onClick={onClick}
    >
      <div className="relative bg-grey-dark overflow-hidden" style={{ aspectRatio: '16/9' }}>
        {video.thumbnail ? (
          <Image
            src={video.thumbnail}
            alt={video.title}
            fill
            unoptimized
            className="object-cover media-zoom group-hover:brightness-75"
            sizes="33vw"
            priority={priority}
          />
        ) : (
          <div className="absolute inset-0 bg-grey-dark" />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.92 }} transition={{ duration: 0.2 }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#E8001C" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <polygon points="10,8 16,12 10,16" fill="#E8001C" stroke="#E8001C" />
            </svg>
          </motion.div>
        </div>
      </div>

      <div style={{ paddingTop: 10 }}>
        <h3 className="text-white font-bold text-sm uppercase" style={{ letterSpacing: '0.08em' }}>
          {video.title}
        </h3>
        {video.description && (
          <p className="text-grey-mid text-xs mt-1 line-clamp-2">{video.description}</p>
        )}
      </div>
    </motion.div>
  );
}
