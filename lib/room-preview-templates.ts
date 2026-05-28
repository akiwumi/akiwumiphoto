export type RoomPreviewOrientation = 'portrait' | 'landscape' | 'square';
export type RoomPreviewSize = 'small' | 'medium' | 'large';
export type RoomPreviewFrame = 'black' | 'white' | 'oak';

export type RoomPreviewTemplate = {
  id: string;
  name: string;
  imagePath: string;
  wall: {
    centerXPercent: number;
    centerYPercent: number;
    maxWidthPercent: number;
    maxHeightPercent: number;
  };
  defaultFrame: RoomPreviewFrame;
  supportedOrientations: RoomPreviewOrientation[];
};

export type RoomPreviewSizePreset = {
  id: RoomPreviewSize;
  label: string;
  scale: number;
};

export type RoomPreviewFramePreset = {
  id: RoomPreviewFrame;
  label: string;
  frameColor: string;
  matColor: string;
};

export const ROOM_PREVIEW_TEMPLATES: RoomPreviewTemplate[] = [
  {
    id: 'black-wall-gallery',
    name: 'Black Wall Gallery',
    imagePath: '/images/rooms/room-1.jpg',
    wall: {
      centerXPercent: 52,
      centerYPercent: 30,
      maxWidthPercent: 32,
      maxHeightPercent: 34,
    },
    defaultFrame: 'black',
    supportedOrientations: ['portrait', 'landscape', 'square'],
  },
  {
    id: 'midnight-lounge',
    name: 'Midnight Lounge',
    imagePath: '/images/rooms/room-2.jpg',
    wall: {
      centerXPercent: 51,
      centerYPercent: 29,
      maxWidthPercent: 36,
      maxHeightPercent: 35,
    },
    defaultFrame: 'black',
    supportedOrientations: ['portrait', 'landscape', 'square'],
  },
  {
    id: 'white-wall-salon',
    name: 'White Wall Salon',
    imagePath: '/images/rooms/room-3.jpg',
    wall: {
      centerXPercent: 51,
      centerYPercent: 28,
      maxWidthPercent: 34,
      maxHeightPercent: 34,
    },
    defaultFrame: 'white',
    supportedOrientations: ['portrait', 'landscape', 'square'],
  },
  {
    id: 'beam-house',
    name: 'Beam House',
    imagePath: '/images/rooms/room-4.jpg',
    wall: {
      centerXPercent: 52,
      centerYPercent: 30,
      maxWidthPercent: 35,
      maxHeightPercent: 36,
    },
    defaultFrame: 'oak',
    supportedOrientations: ['portrait', 'landscape', 'square'],
  },
];

export const ROOM_PREVIEW_SIZE_PRESETS: RoomPreviewSizePreset[] = [
  { id: 'small', label: 'Small', scale: 0.64 },
  { id: 'medium', label: 'Medium', scale: 0.82 },
  { id: 'large', label: 'Large', scale: 1 },
];

export const ROOM_PREVIEW_FRAME_PRESETS: RoomPreviewFramePreset[] = [
  {
    id: 'black',
    label: 'Black',
    frameColor: '#111111',
    matColor: '#f4f0e8',
  },
  {
    id: 'white',
    label: 'White',
    frameColor: '#f3f1ec',
    matColor: '#fbfaf6',
  },
  {
    id: 'oak',
    label: 'Oak',
    frameColor: '#b98a54',
    matColor: '#f6f0e6',
  },
];

export const DEFAULT_ROOM_PREVIEW_TEMPLATE_ID = ROOM_PREVIEW_TEMPLATES[0].id;
export const DEFAULT_ROOM_PREVIEW_SIZE: RoomPreviewSize = 'medium';
export const DEFAULT_ROOM_PREVIEW_FRAME: RoomPreviewFrame = ROOM_PREVIEW_TEMPLATES[0].defaultFrame;
