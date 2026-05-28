'use client';

import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import RoomPreview from '@/components/RoomPreview';
import type { GalleryImage } from '@/types';
import {
  DEFAULT_ROOM_PREVIEW_FRAME,
  DEFAULT_ROOM_PREVIEW_SIZE,
  DEFAULT_ROOM_PREVIEW_TEMPLATE_ID,
  ROOM_PREVIEW_FRAME_PRESETS,
  ROOM_PREVIEW_SIZE_PRESETS,
  ROOM_PREVIEW_TEMPLATES,
  type RoomPreviewFrame,
  type RoomPreviewSize,
} from '@/lib/room-preview-templates';

interface Props {
  images: GalleryImage[];
  initialIndex: number;
  onClose: () => void;
}

type LightboxMode = 'room' | 'photo';

export default function Lightbox({ images, initialIndex, onClose }: Props) {
  const [current, setCurrent] = useState(initialIndex);
  const [mode, setMode] = useState<LightboxMode>('photo');
  const [selectedRoomId, setSelectedRoomId] = useState(DEFAULT_ROOM_PREVIEW_TEMPLATE_ID);
  const [selectedSize, setSelectedSize] = useState<RoomPreviewSize>(DEFAULT_ROOM_PREVIEW_SIZE);
  const [selectedFrame, setSelectedFrame] = useState<RoomPreviewFrame>(DEFAULT_ROOM_PREVIEW_FRAME);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  const prev = useCallback(() => setCurrent((c) => (c > 0 ? c - 1 : images.length - 1)), [images.length]);
  const next = useCallback(() => setCurrent((c) => (c < images.length - 1 ? c + 1 : 0)), [images.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'ArrowLeft') {
        prev();
        return;
      }

      if (e.key === 'ArrowRight') {
        next();
        return;
      }

      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    previouslyFocusedElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousBodyOverflow = document.body.style.overflow;

    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLElement>('button')?.focus();
    });

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousBodyOverflow;
      previouslyFocusedElementRef.current?.focus();
    };
  }, [onClose, prev, next]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dy) > Math.abs(dx) && dy > 60) {
      onClose();
      return;
    }
    if (Math.abs(dx) > 40) {
      if (dx < 0) {
        next();
      } else {
        prev();
      }
    }
    setTouchStart(null);
  };

  const image = images[current];
  const selectedRoom = useMemo(
    () => ROOM_PREVIEW_TEMPLATES.find((room) => room.id === selectedRoomId) ?? ROOM_PREVIEW_TEMPLATES[0],
    [selectedRoomId],
  );
  const selectedSizePreset = useMemo(
    () => ROOM_PREVIEW_SIZE_PRESETS.find((size) => size.id === selectedSize) ?? ROOM_PREVIEW_SIZE_PRESETS[0],
    [selectedSize],
  );
  const selectedFramePreset = useMemo(
    () => ROOM_PREVIEW_FRAME_PRESETS.find((frame) => frame.id === selectedFrame) ?? ROOM_PREVIEW_FRAME_PRESETS[0],
    [selectedFrame],
  );

  return (
    <AnimatePresence>
      <motion.div
        ref={dialogRef}
        className="lightbox-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Gallery preview"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="lightbox-topbar">
          <div className="lightbox-mode-toggle" aria-label="Preview mode">
            <button type="button" aria-pressed={mode === 'room'} onClick={() => setMode('room')}>
              Room
            </button>
            <button type="button" aria-pressed={mode === 'photo'} onClick={() => setMode('photo')}>
              Photo
            </button>
          </div>

          <button type="button" onClick={onClose} className="lightbox-close" aria-label="Close lightbox">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <button
          type="button"
          onClick={prev}
          className="lightbox-arrow lightbox-arrow-prev"
          aria-label="Previous image"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <polyline points="15,18 9,12 15,6" />
          </svg>
        </button>

        <motion.div
          key={`${mode}-${current}-${selectedRoom.id}-${selectedSize}-${selectedFrame}`}
          className="lightbox-preview"
          initial={{ scale: 0.94, opacity: 0, filter: 'blur(4px)' }}
          animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
          exit={{ scale: 0.94, opacity: 0, filter: 'blur(4px)' }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {mode === 'room' ? (
            <RoomPreview image={image} room={selectedRoom} size={selectedSizePreset} frame={selectedFramePreset} />
          ) : (
            <div className="lightbox-photo-stage">
              <Image
                src={image.storage_path}
                alt={image.title || `Image ${current + 1}`}
                fill
                unoptimized
                className="lightbox-photo"
                sizes="90vw"
                priority
              />
            </div>
          )}
        </motion.div>

        <div className="lightbox-footer">
          <div className="lightbox-caption">
            {image.title && <p className="lightbox-title">{image.title}</p>}
            {image.description && <p className="lightbox-description">{image.description}</p>}
            <p className="lightbox-count">{current + 1} / {images.length}</p>
          </div>

          {mode === 'room' && (
            <div className="lightbox-controls" aria-label="Room preview controls">
              <div className="lightbox-control-group" aria-label="Artwork size">
                <span>Size</span>
                {ROOM_PREVIEW_SIZE_PRESETS.map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    aria-pressed={selectedSize === size.id}
                    onClick={() => setSelectedSize(size.id)}
                  >
                    {size.label}
                  </button>
                ))}
              </div>

              <div className="lightbox-control-group lightbox-room-group" aria-label="Room template">
                <span>Room</span>
                {ROOM_PREVIEW_TEMPLATES.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    aria-pressed={selectedRoomId === room.id}
                    onClick={() => {
                      setSelectedRoomId(room.id);
                      setSelectedFrame(room.defaultFrame);
                    }}
                  >
                    {room.name}
                  </button>
                ))}
              </div>

              <div className="lightbox-frame-group" aria-label="Frame style">
                <span>Frame</span>
                {ROOM_PREVIEW_FRAME_PRESETS.map((frame) => (
                  <button
                    key={frame.id}
                    type="button"
                    className="lightbox-frame-swatch"
                    style={{ backgroundColor: frame.frameColor }}
                    aria-label={`${frame.label} frame`}
                    aria-pressed={selectedFrame === frame.id}
                    onClick={() => setSelectedFrame(frame.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={next}
          className="lightbox-arrow lightbox-arrow-next"
          aria-label="Next image"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <polyline points="9,18 15,12 9,6" />
          </svg>
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
