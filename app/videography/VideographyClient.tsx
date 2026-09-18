'use client';

import { useState } from 'react';
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
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="site-page-heading" style={{ padding: '14px 60px 10px' }}>
          <h1
            className="text-white font-bold uppercase leading-none mb-2"
            style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', letterSpacing: '0.08em' }}
          >
            Film & moving image
          </h1>
          <div className="red-rule" />
        </div>

        {/* Grid */}
        {videos.length > 0 ? (
          <div
            className="site-media-grid"
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

function VideoCard({ video, priority, onClick }: { video: Video; priority?: boolean; onClick: () => void }) {
  return (
    <div
      className="group cursor-pointer motion-card"
      role="button"
      tabIndex={0}
      aria-label={`Play ${video.title}`}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
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
            draggable={false}
            className="object-cover media-zoom group-hover:brightness-75"
            sizes="33vw"
            priority={priority}
          />
        ) : (
          <div className="absolute inset-0 bg-grey-dark" />
        )}
        <div className="img-shield" onContextMenu={(e) => e.preventDefault()} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="video-play-control">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="currentColor" />
            </svg>
          </div>
        </div>
      </div>

      <div style={{ paddingTop: 10 }}>
        <h3 className="text-[var(--site-text)] font-bold text-sm uppercase" style={{ letterSpacing: '0.08em' }}>
          {video.title}
        </h3>
        {video.description && (
          <p className="text-grey-mid text-base mt-1 line-clamp-2">{video.description}</p>
        )}
      </div>
    </div>
  );
}
