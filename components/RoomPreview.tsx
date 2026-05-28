'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import type { CSSProperties } from 'react';
import type { GalleryImage } from '@/types';
import type {
  RoomPreviewFramePreset,
  RoomPreviewSizePreset,
  RoomPreviewTemplate,
} from '@/lib/room-preview-templates';
import { calculateArtworkFit } from '@/lib/room-preview-geometry';

type Props = {
  image: GalleryImage;
  room: RoomPreviewTemplate;
  size: RoomPreviewSizePreset;
  frame: RoomPreviewFramePreset;
};

type NaturalDimensions = {
  src: string;
  width: number;
  height: number;
};

type RoomPreviewStyle = CSSProperties & {
  '--room-art-left': string;
  '--room-art-top': string;
  '--room-art-width': string;
  '--room-art-height': string;
  '--room-frame-color': string;
  '--room-mat-color': string;
};

export default function RoomPreview({ image, room, size, frame }: Props) {
  const [naturalDimensions, setNaturalDimensions] = useState<NaturalDimensions | null>(null);
  const activeNaturalDimensions = naturalDimensions?.src === image.storage_path ? naturalDimensions : null;

  const stageRef = useRef<HTMLDivElement>(null);
  const [stageAspectRatio, setStageAspectRatio] = useState(16 / 10);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        if (height > 0) setStageAspectRatio(width / height);
      }
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const artworkFit = useMemo(() => {
    const dimensions = activeNaturalDimensions ?? { width: 1, height: 1 };

    return calculateArtworkFit({
      imageWidth: dimensions.width,
      imageHeight: dimensions.height,
      maxWidth: room.wall.maxWidthPercent,
      maxHeight: room.wall.maxHeightPercent,
      sizeScale: size.scale,
      stageAspectRatio,
    });
  }, [activeNaturalDimensions, room.wall.maxHeightPercent, room.wall.maxWidthPercent, size.scale, stageAspectRatio]);

  const previewStyle: RoomPreviewStyle = {
    '--room-art-left': `${room.wall.centerXPercent}%`,
    '--room-art-top': `${room.wall.centerYPercent}%`,
    '--room-art-width': `${artworkFit.width}%`,
    '--room-art-height': `${artworkFit.height}%`,
    '--room-frame-color': frame.frameColor,
    '--room-mat-color': frame.matColor,
  };

  return (
    <div ref={stageRef} className="room-preview-stage" style={previewStyle} aria-label={`${image.title || 'Selected photograph'} in ${room.name}`}>
      <Image
        src={room.imagePath}
        alt=""
        fill
        className="room-preview-background"
        sizes="(max-width: 768px) 100vw, 86vw"
        priority
      />

      <div className="room-preview-artwork" data-orientation={artworkFit.orientation}>
        <div className="room-preview-artwork-inner">
          <Image
            key={image.storage_path}
            src={image.storage_path}
            alt={image.title || 'Selected gallery photograph'}
            fill
            unoptimized
            className="room-preview-photo"
            sizes="(max-width: 768px) 46vw, 28vw"
            priority
            onLoad={(event) => {
              const target = event.currentTarget;
              setNaturalDimensions({
                src: image.storage_path,
                width: target.naturalWidth,
                height: target.naturalHeight,
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}
