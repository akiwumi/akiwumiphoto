'use client';

import { usePathname } from 'next/navigation';
import { useAudio } from '@/contexts/AudioContext';

export default function MusicToggle() {
  const { isPlaying, toggle } = useAudio();
  const pathname = usePathname();

  if (pathname.startsWith('/admin')) return null;

  return (
    <button
      onClick={toggle}
      aria-label={isPlaying ? 'Pause ambient music' : 'Play ambient music'}
      className="fixed bottom-6 right-6 z-[200] w-11 h-11 flex items-center justify-center transition-colors duration-150 hover:text-red"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        color: '#FFFFFF',
        background: 'rgba(0,0,0,0.45)',
        borderRadius: '50%',
        backdropFilter: 'blur(4px)',
      }}
    >
      {isPlaying ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
          <line x1="2" y1="2" x2="22" y2="22" />
        </svg>
      )}
    </button>
  );
}
