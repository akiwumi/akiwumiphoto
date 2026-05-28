export type RoomPreviewOrientation = 'portrait' | 'landscape' | 'square';

export interface CalculateArtworkFitInput {
  imageWidth: number;
  imageHeight: number;
  maxWidth: number;
  maxHeight: number;
  sizeScale: number;
}

export function classifyOrientation(width: number, height: number): RoomPreviewOrientation;

export function calculateArtworkFit(input: CalculateArtworkFitInput): {
  width: number;
  height: number;
  orientation: RoomPreviewOrientation;
};
