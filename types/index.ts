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
  /** Whether the photograph can be bought as a print. Absent in demo data. */
  for_sale?: boolean;
}

/** A named selection of photographs within a gallery. */
export interface GallerySection {
  id: string;
  gallery_id: string;
  title: string;
  slug: string;
  /** Falls back to the first photograph when null. */
  cover_image_id: string | null;
  sort_order: number;
}

/** A photograph's place in a sub-gallery; a photograph can be in several. */
export interface GallerySectionImage {
  section_id: string;
  image_id: string;
  sort_order: number;
}

/** A size every photograph is offered in; each size is its own edition. */
export interface PrintSize {
  id: string;
  name: string;
  dimensions: string;
  /** Null is price on application: shown, but not purchasable. */
  price_usd: number | null;
  edition_size: number;
  sort_order: number;
  active: boolean;
}

/** Sold counts for one photograph, keyed by print size id. */
export type SoldBySize = Record<string, number>;

/** A photograph as the basket shows it (from /api/prints/catalog). */
export interface CatalogImage {
  id: string;
  galleryTitle: string;
  gallerySlug: string;
  title: string | null;
  /** 1-based position within its gallery, as the lightbox counts. */
  position: number;
  thumbnail: string | null;
  /** False once unpublished or taken off sale. */
  forSale: boolean;
}

/** A priced line as recorded on an order by submit_print_order. */
export interface PrintOrderLine {
  image_id: string;
  size_id: string;
  gallery_title: string;
  gallery_slug: string;
  image_title: string | null;
  file_ref: string;
  position: number;
  size_name: string;
  dimensions: string;
  edition_size: number;
  sold: number;
  quantity: number;
  unit_price_usd: number;
  line_total_usd: number;
}

export interface PrintOrder {
  id: string;
  reference: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  country: string | null;
  message: string | null;
  currency: string;
  exchange_rate: number;
  lines: PrintOrderLine[];
  total_usd: number;
  status: 'new' | 'contacted' | 'paid' | 'cancelled';
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

export type ModalFrequency = 'every_view' | 'once_per_session' | 'once';

/** An announcement that pops up on chosen pages; see lib/site-modals.ts. */
export interface SiteModal {
  id: string;
  title: string;
  body: string;
  cta_label: string | null;
  cta_url: string | null;
  /** Page keys from SITE_PAGES, or 'all'. */
  pages: string[];
  delay_seconds: number;
  /** Null stays open until dismissed. */
  auto_close_seconds: number | null;
  frequency: ModalFrequency;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  show_on_news: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** A page the admin creates, served at /<slug> or /<parent>/<slug>; see lib/site-pages.ts. */
export interface SitePage {
  id: string;
  /** Set on sub pages; nesting is one level deep. */
  parent_id: string | null;
  title: string;
  slug: string;
  intro: string;
  /** Validated with parseBlocks (lib/page-blocks.ts) before rendering. */
  blocks: unknown;
  cover_image: string | null;
  cover_width: number | null;
  cover_height: number | null;
  seo_description: string | null;
  published: boolean;
  show_in_nav: boolean;
  nav_order: number;
  created_at: string;
  updated_at: string;
}

/** A created page as the menu links to it. */
export interface NavPage {
  title: string;
  slug: string;
}
