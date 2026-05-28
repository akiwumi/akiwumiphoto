const NEAR_SQUARE_RATIO = 0.08;

/**
 * @typedef {'portrait' | 'landscape' | 'square'} RoomPreviewOrientation
 *
 * @typedef {Object} CalculateArtworkFitInput
 * @property {number} imageWidth
 * @property {number} imageHeight
 * @property {number} maxWidth
 * @property {number} maxHeight
 * @property {number} sizeScale
 * @property {number} [stageAspectRatio]
 */

/**
 * @param {number} width
 * @param {number} height
 * @returns {RoomPreviewOrientation}
 */
export function classifyOrientation(width, height) {
  if (width <= 0 || height <= 0) {
    return 'square';
  }

  const ratio = width / height;
  if (Math.abs(1 - ratio) <= NEAR_SQUARE_RATIO) {
    return 'square';
  }

  return ratio > 1 ? 'landscape' : 'portrait';
}

/**
 * @param {CalculateArtworkFitInput} input
 * @returns {{ width: number; height: number; orientation: RoomPreviewOrientation }}
 */
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

  // True pixel ratio of the wall slot: maxWidth% resolves against stage width,
  // maxHeight% against stage height, so the same percentage yields different pixels.
  const wallPixelRatio = (scaledMaxWidth / scaledMaxHeight) * stageAspectRatio;

  let widthPercent, heightPercent;

  if (imageRatio >= wallPixelRatio) {
    // Width-constrained: fill the slot horizontally.
    widthPercent = scaledMaxWidth;
    // height% = widthPercent% × stageAspectRatio / imageRatio  (converts px back to %)
    heightPercent = widthPercent * stageAspectRatio / imageRatio;
  } else {
    // Height-constrained: fill the slot vertically.
    heightPercent = scaledMaxHeight;
    // width% = heightPercent% × imageRatio / stageAspectRatio
    widthPercent = heightPercent * imageRatio / stageAspectRatio;
  }

  return { width: widthPercent, height: heightPercent, orientation };
}
