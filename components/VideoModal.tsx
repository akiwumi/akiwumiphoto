'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudio } from '@/contexts/AudioContext';
import type { Video } from '@/types';

interface Props {
  video: Video;
  onClose: () => void;
}

function getEmbedUrl(url: string): string {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
  // Direct URL
  return url;
}

export default function VideoModal({ video, onClose }: Props) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const { pauseForVideo, resumeAfterVideo } = useAudio();
  const embedUrl = getEmbedUrl(video.video_url);
  const isDirect = !embedUrl.includes('youtube') && !embedUrl.includes('vimeo');

  useEffect(() => {
    pauseForVideo();
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      resumeAfterVideo();
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose, pauseForVideo, resumeAfterVideo]);

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientY);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart !== null && e.changedTouches[0].clientY - touchStart > 80) onClose();
    setTouchStart(null);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[300] flex flex-col items-center justify-center px-4"
        style={{
          background: 'rgba(0,0,0,0.92)',
          backdropFilter: 'blur(16px)',
          height: '100dvh',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-11 h-11 flex items-center justify-center text-red hover:scale-110 transition-transform z-10"
          aria-label="Close video"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <motion.div
          className="w-full"
          style={{ maxWidth: 'min(85vw, 1200px)' }}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
            {isDirect ? (
              <video
                src={embedUrl}
                className="w-full h-full"
                controls
                autoPlay
              />
            ) : (
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title={video.title}
              />
            )}
          </div>

          <div className="mt-4">
            <h2 className="text-white font-bold text-xl uppercase" style={{ letterSpacing: '0.08em' }}>
              {video.title}
            </h2>
            {video.description && (
              <p className="text-white/75 text-sm mt-2 max-w-[700px]">{video.description}</p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
