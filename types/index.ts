export interface Gallery {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  sort_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface GalleryImage {
  id: string;
  gallery_id: string;
  storage_path: string;
  title: string | null;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface Video {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail: string | null;
  sort_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface PageContent {
  page: string;
  key: string;
  value: string | null;
}

export interface Collector {
  id: string;
  auth_user_id: string | null;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  region: string | null;
  postcode: string;
  /** ISO 3166-1 alpha-2. */
  country_code: string;
  email_verified: boolean;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseMessage {
  id: string;
  collector_id: string;
  artwork_title: string;
  purchase_reference: string | null;
  purchased_on: string | null;
  purchased_from: string | null;
  message: string;
  status: 'received' | 'reviewing' | 'confirmed' | 'rejected';
  created_at: string;
}
