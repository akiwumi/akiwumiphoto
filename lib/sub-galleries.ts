import type { GalleryImage, GallerySection, GallerySectionImage } from '@/types';

export function slugify(title: string): string {
  return title.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sub-gallery';
}

/** A slug for a sub-gallery that no other sub-gallery in the gallery uses. */
export function uniqueSlug(title: string, taken: string[], ownSlug?: string): string {
  const base = slugify(title);
  const others = new Set(taken.filter((s) => s !== ownSlug));
  if (!others.has(base)) return base;
  let n = 2;
  while (others.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/** A sub-gallery's photographs in their sub-gallery order. */
export function sectionImages(
  section: GallerySection,
  images: GalleryImage[],
  memberships: GallerySectionImage[],
): GalleryImage[] {
  const byId = new Map(images.map((image) => [image.id, image]));
  return memberships
    .filter((m) => m.section_id === section.id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((m) => byId.get(m.image_id))
    .filter((image): image is GalleryImage => Boolean(image));
}

/** The chosen cover, or the first photograph when none is set. */
export function sectionCover(section: GallerySection, members: GalleryImage[]): GalleryImage | undefined {
  return members.find((image) => image.id === section.cover_image_id) ?? members[0];
}
