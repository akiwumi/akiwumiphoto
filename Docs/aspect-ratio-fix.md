# Aspect Ratio Fix — Room Preview Frame

## Problem

The frame rendered in the room preview always has the wrong aspect ratio. A portrait photo
(600×750) renders inside a landscape frame. The mismatch is consistent across all demo images
because they are all 600×750 portrait.

Root cause is in `calculateArtworkFit` (`lib/room-preview-geometry.js`). The function computes
the wall slot's aspect ratio as:

```js
const wallRatio = scaledMaxWidth / scaledMaxHeight; // e.g. 26.24 / 27.88 = 0.941
```

This treats `maxWidth%` and `maxHeight%` as if they are in the same pixel unit. They are not.
`width: X%` on the artwork element resolves against the **stage width** (1180px on desktop).
`height: X%` resolves against the **stage height** (686px on desktop). The stage is 16:10 (ratio
1.72), so the same percentage produces very different pixel values on each axis.

The actual wall slot pixel ratio is:

```
(26.24% × 1180px) / (27.88% × 686px) = 309px / 191px = 1.618  ← landscape
```

The function sees `wallRatio = 0.941` (near-square), compares the portrait image ratio (0.8) to
it, picks the wrong constraint branch, and returns a frame that is 263×191px (landscape) instead
of the correct 153×191px (portrait).

---

## Fix

### 1. `lib/room-preview-geometry.js`

Add `stageAspectRatio` as an input parameter (default `1.6` for the 16:10 desktop stage).
Use it to compute the true pixel ratio of the wall slot, then derive `widthPercent` and
`heightPercent` so that `(widthPercent% × stageWidth) / (heightPercent% × stageHeight)`
equals the image's aspect ratio.

```js
export function calculateArtworkFit({
  imageWidth,
  imageHeight,
  maxWidth,
  maxHeight,
  sizeScale,
  stageAspectRatio = 1.6,
}) {
  const orientation = classifyOrientation(imageWidth, imageHeight);

  if (imageWidth <= 0 || imageHeight <= 0 || maxWidth <= 0 || maxHeight <= 0 || sizeScale <= 0) {
    return { width: 0, height: 0, orientation };
  }

  const scaledMaxWidth = maxWidth * sizeScale;
  const scaledMaxHeight = maxHeight * sizeScale;
  const imageRatio = imageWidth / imageHeight;

  // True pixel ratio of the wall slot, accounting for the non-square stage.
  const wallPixelRatio = (scaledMaxWidth / scaledMaxHeight) * stageAspectRatio;

  let widthPercent, heightPercent;

  if (imageRatio >= wallPixelRatio) {
    // Image is wider than the wall slot — constrained by width.
    widthPercent = scaledMaxWidth;
    // height_px = (widthPercent% × stageWidth) / imageRatio
    // height%   = height_px / stageHeight = widthPercent% × stageAspectRatio / imageRatio
    heightPercent = widthPercent * stageAspectRatio / imageRatio;
  } else {
    // Image is taller than the wall slot — constrained by height.
    heightPercent = scaledMaxHeight;
    // width_px  = heightPercent% × stageHeight × imageRatio
    // width%    = width_px / stageWidth = heightPercent% × imageRatio / stageAspectRatio
    widthPercent = heightPercent * imageRatio / stageAspectRatio;
  }

  return { width: widthPercent, height: heightPercent, orientation };
}
```

Verification with the failing case (portrait 600×750, black-wall-gallery room, medium size):
- `wallPixelRatio = (26.24 / 27.88) × 1.72 = 1.618`
- `imageRatio (0.8) < wallPixelRatio (1.618)` → height-constrained
- `heightPercent = 27.88%` → 191px ✓
- `widthPercent = 27.88 × 0.8 / 1.72 = 12.97%` → 153px ✓
- Frame: 153×191px, ratio 0.80 — matches the portrait photo ✓

### 2. `lib/room-preview-geometry.d.ts`

Add the optional parameter to the input interface:

```ts
export interface CalculateArtworkFitInput {
  imageWidth: number;
  imageHeight: number;
  maxWidth: number;
  maxHeight: number;
  sizeScale: number;
  stageAspectRatio?: number;
}
```

### 3. `components/RoomPreview.tsx`

Track the stage's actual rendered aspect ratio with a `ResizeObserver` so the fix works at
all viewport sizes (the stage switches from 16:10 on desktop to 4:5 on mobile at ≤900px).

```tsx
// Add to imports
import { useEffect, useMemo, useRef, useState } from 'react';

// Add inside the component, before artworkFit
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

// Pass stageAspectRatio into calculateArtworkFit
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
```

Add `ref={stageRef}` to the stage div:

```tsx
<div ref={stageRef} className="room-preview-stage" style={previewStyle} ...>
```

Also change the fallback dimensions from `{ width: 4, height: 3 }` to `{ width: 1, height: 1 }`
so the initial frame renders as a neutral square instead of always forcing landscape before the
image loads.

---

## Why `object-fit: cover` is fine after this fix

Once the frame dimensions correctly match the photo's aspect ratio, `object-fit: cover` on
`.room-preview-photo` produces no cropping — the image fills a container that is already the
right shape. No CSS change needed.

---

## Files changed

| File | Change |
|------|--------|
| `lib/room-preview-geometry.js` | Add `stageAspectRatio` param; fix wall slot pixel ratio calculation |
| `lib/room-preview-geometry.d.ts` | Add `stageAspectRatio?: number` to `CalculateArtworkFitInput` |
| `components/RoomPreview.tsx` | Add `useRef` + `ResizeObserver` to track stage ratio; pass to `calculateArtworkFit`; fix fallback to `1:1` |
