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
}) {
  const orientation = classifyOrientation(imageWidth, imageHeight);

  if (imageWidth <= 0 || imageHeight <= 0 || maxWidth <= 0 || maxHeight <= 0 || sizeScale <= 0) {
    return { width: 0, height: 0, orientation };
  }

  const scaledMaxWidth = maxWidth * sizeScale;
  const scaledMaxHeight = maxHeight * sizeScale;
  const imageRatio = imageWidth / imageHeight;
  const wallRatio = scaledMaxWidth / scaledMaxHeight;

  if (imageRatio >= wallRatio) {
    return {
      width: scaledMaxWidth,
      height: scaledMaxWidth / imageRatio,
      orientation,
    };
  }

  return {
    width: scaledMaxHeight * imageRatio,
    height: scaledMaxHeight,
    orientation,
  };
}
