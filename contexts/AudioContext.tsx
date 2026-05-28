'use client';

import { createContext, useContext, useRef, useState, useCallback, useEffect, ReactNode } from 'react';

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const gainRef = useRef<GainNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const startedRef = useRef(false);

  const ensureAudio = useCallback(() => {
    if (audioRef.current) return;

    const audio = new Audio('/audio/ambient.mp3');
    audio.loop = true;
    audioRef.current = audio;

    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    audioCtxRef.current = ctx;

    const gain = ctx.createGain();
    gain.gain.value = 0;
    gainRef.current = gain;

    const source = ctx.createMediaElementSource(audio);
    source.connect(gain);
    gain.connect(ctx.destination);
  }, []);

  const start = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    ensureAudio();

    const ctx = audioCtxRef.current!;
    if (ctx.state === 'suspended') ctx.resume();

    audioRef.current!.play().catch(() => {});
    const gain = gainRef.current!;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 2);
    setIsPlaying(true);
  }, [ensureAudio]);

  const toggle = useCallback(() => {
    ensureAudio();
    if (!audioRef.current) return;

    const ctx = audioCtxRef.current!;
    const gain = gainRef.current!;

    if (isPlaying) {
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
      setTimeout(() => audioRef.current?.pause(), 1500);
      setIsPlaying(false);
      startedRef.current = false;
    } else {
      startedRef.current = true;
      if (ctx.state === 'suspended') ctx.resume();
      audioRef.current.play().catch(() => {});
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 2);
      setIsPlaying(true);
    }
  }, [ensureAudio, isPlaying]);

  const pauseForVideo = useCallback(() => {
    if (!audioRef.current || !gainRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const gain = gainRef.current;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
    setTimeout(() => audioRef.current?.pause(), 800);
  }, []);

  const resumeAfterVideo = useCallback(() => {
    if (!isPlaying || !audioRef.current || !gainRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const gain = gainRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    audioRef.current.play().catch(() => {});
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 1.5);
  }, [isPlaying]);

  // Auto-start on first user interaction anywhere in the app
  useEffect(() => {
    const handler = () => {
      start();
      window.removeEventListener('click', handler);
      window.removeEventListener('keydown', handler);
      window.removeEventListener('touchstart', handler);
    };

    window.addEventListener('click', handler, { once: true });
    window.addEventListener('keydown', handler, { once: true });
    window.addEventListener('touchstart', handler, { once: true });

    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('keydown', handler);
      window.removeEventListener('touchstart', handler);
    };
  }, [start]);

  return (
    <AudioCtx.Provider value={{ isPlaying, toggle, start, pauseForVideo, resumeAfterVideo }}>
      {children}
    </AudioCtx.Provider>
  );
}

export const useAudio = () => useContext(AudioCtx);
