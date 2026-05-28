'use client';

import { createContext, useContext, useRef, useState, useCallback, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

interface AudioContextValue {
  isPlaying: boolean;
  toggle: () => void;
  start: () => void;
  pauseForVideo: () => void;
  resumeAfterVideo: () => void;
}

const AudioCtx = createContext<AudioContextValue>({
  isPlaying: false,
  toggle: () => {},
  start: () => {},
  pauseForVideo: () => {},
  resumeAfterVideo: () => {},
});

export function AudioProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const startedRef = useRef(false);
  const fadeRafRef = useRef<number | null>(null);

  const ensureAudio = useCallback(() => {
    if (audioRef.current) return;
    const audio = new Audio('/audio/ambient.mp3');
    audio.loop = true;
    audio.volume = 0;
    audioRef.current = audio;
  }, []);

  const cancelFade = useCallback(() => {
    if (fadeRafRef.current !== null) {
      cancelAnimationFrame(fadeRafRef.current);
      fadeRafRef.current = null;
    }
  }, []);

  const fadeIn = useCallback((durationMs = 2000) => {
    const audio = audioRef.current;
    if (!audio) return;
    cancelFade();
    const startTime = performance.now();
    const fromVol = audio.volume;
    const toVol = 0.35;
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / durationMs, 1);
      audio.volume = fromVol + (toVol - fromVol) * t;
      if (t < 1) fadeRafRef.current = requestAnimationFrame(tick);
      else fadeRafRef.current = null;
    };
    fadeRafRef.current = requestAnimationFrame(tick);
  }, [cancelFade]);

  const fadeOut = useCallback((durationMs = 1500, onDone?: () => void) => {
    const audio = audioRef.current;
    if (!audio) return;
    cancelFade();
    const startTime = performance.now();
    const fromVol = audio.volume;
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / durationMs, 1);
      audio.volume = fromVol * (1 - t);
      if (t < 1) {
        fadeRafRef.current = requestAnimationFrame(tick);
      } else {
        fadeRafRef.current = null;
        audio.pause();
        onDone?.();
      }
    };
    fadeRafRef.current = requestAnimationFrame(tick);
  }, [cancelFade]);

  const start = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    ensureAudio();
    const audio = audioRef.current!;
    audio.volume = 0;
    try {
      await audio.play();
      fadeIn(2000);
      setIsPlaying(true);
    } catch {
      // Autoplay blocked — reset so the toggle button can retry
      startedRef.current = false;
    }
  }, [ensureAudio, fadeIn]);

  const toggle = useCallback(async () => {
    ensureAudio();
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      setIsPlaying(false);
      startedRef.current = false;
      fadeOut(1500);
    } else {
      startedRef.current = true;
      audio.volume = 0;
      try {
        await audio.play();
        fadeIn(2000);
        setIsPlaying(true);
      } catch {
        startedRef.current = false;
      }
    }
  }, [ensureAudio, isPlaying, fadeIn, fadeOut]);

  const pauseForVideo = useCallback(() => {
    if (!audioRef.current) return;
    fadeOut(800);
  }, [fadeOut]);

  const resumeAfterVideo = useCallback(async () => {
    if (!isPlaying || !audioRef.current) return;
    const audio = audioRef.current;
    audio.volume = 0;
    try {
      await audio.play();
      fadeIn(1500);
    } catch { /* ignore */ }
  }, [isPlaying, fadeIn]);

  // Auto-start on first user interaction — disabled on admin routes
  useEffect(() => {
    if (isAdmin) return;
    const handler = () => { start(); };
    window.addEventListener('click', handler, { once: true });
    window.addEventListener('keydown', handler, { once: true });
    window.addEventListener('touchstart', handler, { once: true });
    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('keydown', handler);
      window.removeEventListener('touchstart', handler);
    };
  }, [start, isAdmin]);

  return (
    <AudioCtx.Provider value={{ isPlaying, toggle, start, pauseForVideo, resumeAfterVideo }}>
      {children}
    </AudioCtx.Provider>
  );
}

export const useAudio = () => useContext(AudioCtx);
