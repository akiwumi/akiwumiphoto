import type { Gallery, GalleryImage, Video } from '@/types';

const BASE = 'https://picsum.photos/seed';
// Cover images: 3-col grid ~480px wide on 1440 screen, 2x retina
const C = (seed: string) => `${BASE}/${seed}/960/1200`;
// Gallery detail images: same 3-col grid
const I = (seed: string) => `${BASE}/${seed}/600/750`;
// Video thumbnails: 16:9
const V = (seed: string) => `${BASE}/${seed}/800/450`;

export const DEMO_GALLERIES: Gallery[] = [
  {
    id: 'demo-1',
    title: 'Street Portraits',
    slug: 'street-portraits',
    description: 'Documentary work captured across Lagos and London, 2022–2024. Faces, light, motion.',
    cover_image: C('sp-cover'),
    sort_order: 0,
    published: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'demo-2',
    title: 'Architecture',
    slug: 'architecture',
    description: 'Geometric precision and brutal form. Buildings as sculpture.',
    cover_image: C('arch-cover'),
    sort_order: 1,
    published: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'demo-3',
    title: 'Landscapes',
    slug: 'landscapes',
    description: 'Still moments in moving terrain. Light on land and water.',
    cover_image: C('land-cover'),
    sort_order: 2,
    published: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'demo-4',
    title: 'Portraits',
    slug: 'portraits',
    description: 'Close study of the human face. Expression, texture, stillness.',
    cover_image: C('port-cover'),
    sort_order: 3,
    published: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'demo-5',
    title: 'Urban',
    slug: 'urban',
    description: 'The city as material. Concrete, neon, shadow, and noise.',
    cover_image: C('urb-cover'),
    sort_order: 4,
    published: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'demo-6',
    title: 'Wildlife',
    slug: 'wildlife',
    description: 'Patience and proximity. Animals in their element.',
    cover_image: C('wild-cover'),
    sort_order: 5,
    published: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
];

export const DEMO_IMAGES: Record<string, GalleryImage[]> = {
  'demo-1': [
    { id: 'd1-1', gallery_id: 'demo-1', storage_path: I('sp1'), title: 'Morning Light', description: 'Lagos Island, 6am.', sort_order: 0, created_at: '' },
    { id: 'd1-2', gallery_id: 'demo-1', storage_path: I('sp2'), title: 'The Vendor', description: 'Market off Broad Street.', sort_order: 1, created_at: '' },
    { id: 'd1-3', gallery_id: 'demo-1', storage_path: I('sp3'), title: 'In Transit', description: 'Peckham, South London.', sort_order: 2, created_at: '' },
    { id: 'd1-4', gallery_id: 'demo-1', storage_path: I('sp4'), title: 'Wait', description: 'Victoria Island bus stop.', sort_order: 3, created_at: '' },
    { id: 'd1-5', gallery_id: 'demo-1', storage_path: I('sp5'), title: 'Gaze', description: 'Dalston, London, 2023.', sort_order: 4, created_at: '' },
    { id: 'd1-6', gallery_id: 'demo-1', storage_path: I('sp6'), title: 'The Crossroads', description: 'Ojuelegba, Lagos.', sort_order: 5, created_at: '' },
  ],
  'demo-2': [
    { id: 'd2-1', gallery_id: 'demo-2', storage_path: I('arch1'), title: 'Vertical No. 1', description: 'Canary Wharf, London.', sort_order: 0, created_at: '' },
    { id: 'd2-2', gallery_id: 'demo-2', storage_path: I('arch2'), title: 'Grid Study', description: 'National Theatre facade.', sort_order: 1, created_at: '' },
    { id: 'd2-3', gallery_id: 'demo-2', storage_path: I('arch3'), title: 'Stairwell', description: 'Barbican Centre, 2023.', sort_order: 2, created_at: '' },
    { id: 'd2-4', gallery_id: 'demo-2', storage_path: I('arch4'), title: 'Concrete Form', description: 'Brutalist estate, East London.', sort_order: 3, created_at: '' },
    { id: 'd2-5', gallery_id: 'demo-2', storage_path: I('arch5'), title: 'The Arch', description: 'Lagos Business District.', sort_order: 4, created_at: '' },
    { id: 'd2-6', gallery_id: 'demo-2', storage_path: I('arch6'), title: 'Shadow Line', description: 'Late afternoon, Abuja.', sort_order: 5, created_at: '' },
  ],
  'demo-3': [
    { id: 'd3-1', gallery_id: 'demo-3', storage_path: I('land1'), title: 'Dusk', description: 'Atlantic coast, Lagos, 2022.', sort_order: 0, created_at: '' },
    { id: 'd3-2', gallery_id: 'demo-3', storage_path: I('land2'), title: 'Still Water', description: 'Lekki Conservation Centre.', sort_order: 1, created_at: '' },
    { id: 'd3-3', gallery_id: 'demo-3', storage_path: I('land3'), title: 'Horizon', description: 'Bar Beach at sunrise.', sort_order: 2, created_at: '' },
    { id: 'd3-4', gallery_id: 'demo-3', storage_path: I('land4'), title: 'The Mangrove', description: 'Ikorodu waterways.', sort_order: 3, created_at: '' },
    { id: 'd3-5', gallery_id: 'demo-3', storage_path: I('land5'), title: 'Dust', description: 'Sahel, Northern Nigeria.', sort_order: 4, created_at: '' },
    { id: 'd3-6', gallery_id: 'demo-3', storage_path: I('land6'), title: 'After Rain', description: 'Victoria Island, September.', sort_order: 5, created_at: '' },
  ],
  'demo-4': [
    { id: 'd4-1', gallery_id: 'demo-4', storage_path: I('port1'), title: 'Study I', description: 'Natural light, Lagos studio.', sort_order: 0, created_at: '' },
    { id: 'd4-2', gallery_id: 'demo-4', storage_path: I('port2'), title: 'Study II', description: 'Brixton, South London.', sort_order: 1, created_at: '' },
    { id: 'd4-3', gallery_id: 'demo-4', storage_path: I('port3'), title: 'Study III', description: 'Available light only.', sort_order: 2, created_at: '' },
    { id: 'd4-4', gallery_id: 'demo-4', storage_path: I('port4'), title: 'Study IV', description: 'Lekki, 2024.', sort_order: 3, created_at: '' },
    { id: 'd4-5', gallery_id: 'demo-4', storage_path: I('port5'), title: 'Study V', description: 'Hackney, East London.', sort_order: 4, created_at: '' },
    { id: 'd4-6', gallery_id: 'demo-4', storage_path: I('port6'), title: 'Study VI', description: 'Ikoyi, Lagos.', sort_order: 5, created_at: '' },
  ],
  'demo-5': [
    { id: 'd5-1', gallery_id: 'demo-5', storage_path: I('urb1'), title: 'Night Bus', description: 'Lagos mainland, 11pm.', sort_order: 0, created_at: '' },
    { id: 'd5-2', gallery_id: 'demo-5', storage_path: I('urb2'), title: 'Underpass', description: 'Elephant & Castle, London.', sort_order: 1, created_at: '' },
    { id: 'd5-3', gallery_id: 'demo-5', storage_path: I('urb3'), title: 'Scaffold', description: 'Construction, Lagos Island.', sort_order: 2, created_at: '' },
    { id: 'd5-4', gallery_id: 'demo-5', storage_path: I('urb4'), title: 'Market Hour', description: 'Balogun, Lagos.', sort_order: 3, created_at: '' },
    { id: 'd5-5', gallery_id: 'demo-5', storage_path: I('urb5'), title: 'Rush', description: 'London Bridge, 8am.', sort_order: 4, created_at: '' },
    { id: 'd5-6', gallery_id: 'demo-5', storage_path: I('urb6'), title: 'The Corner', description: 'Shoreditch, 2023.', sort_order: 5, created_at: '' },
  ],
  'demo-6': [
    { id: 'd6-1', gallery_id: 'demo-6', storage_path: I('wild1'), title: 'Sentinel', description: 'Yankari Game Reserve.', sort_order: 0, created_at: '' },
    { id: 'd6-2', gallery_id: 'demo-6', storage_path: I('wild2'), title: 'The Herd', description: 'Kainji Lake, Nigeria.', sort_order: 1, created_at: '' },
    { id: 'd6-3', gallery_id: 'demo-6', storage_path: I('wild3'), title: 'Waterhole', description: 'Dawn, dry season.', sort_order: 2, created_at: '' },
    { id: 'd6-4', gallery_id: 'demo-6', storage_path: I('wild4'), title: 'Flight', description: 'Coastal birds, Lagos Lagoon.', sort_order: 3, created_at: '' },
    { id: 'd6-5', gallery_id: 'demo-6', storage_path: I('wild5'), title: 'Still Hunt', description: 'Gashaka-Gumti, 2023.', sort_order: 4, created_at: '' },
    { id: 'd6-6', gallery_id: 'demo-6', storage_path: I('wild6'), title: 'The Wait', description: 'Riverbank, early morning.', sort_order: 5, created_at: '' },
  ],
};

export const DEMO_VIDEOS: Video[] = [
  {
    id: 'dv-1',
    title: 'Lagos in Motion',
    description: 'A short documentary capturing the rhythm and energy of Lagos — markets, traffic, coast, and quiet corners.',
    video_url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    thumbnail: V('vid1'),
    sort_order: 0,
    published: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'dv-2',
    title: 'Concrete & Light',
    description: 'Architecture study — the interplay of shadow and brutalist form across London and Lagos.',
    video_url: 'https://www.youtube.com/watch?v=YE7VzlLtp-4',
    thumbnail: V('vid2'),
    sort_order: 1,
    published: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'dv-3',
    title: 'Coast',
    description: 'Still and long-exposure work along the Atlantic coastline. Water, sky, and the space between.',
    video_url: 'https://www.youtube.com/watch?v=R6MlUcmOul8',
    thumbnail: V('vid3'),
    sort_order: 2,
    published: true,
    created_at: '',
    updated_at: '',
  },
];

export function getDemoGalleryBySlug(slug: string) {
  return DEMO_GALLERIES.find((g) => g.slug === slug) || null;
}

export function getDemoImagesForGallery(galleryId: string) {
  return DEMO_IMAGES[galleryId] || [];
}
