/**
 * Extract the bare object path from a Supabase storage URL.
 * Works with both public URLs and existing signed URLs.
 *
 * e.g.
 *   https://xxx.supabase.co/storage/v1/object/public/gallery-images/galleries/abc/img.jpg
 *   → galleries/abc/img.jpg
 *
 *   galleries/abc/img.jpg  (already a path)
 *   → galleries/abc/img.jpg
 */
export function extractStoragePath(urlOrPath: string, bucket: string): string {
  if (!urlOrPath.startsWith('http')) return urlOrPath;

  const markers = [
    `/object/public/${bucket}/`,
    `/object/sign/${bucket}/`,
    `/object/authenticated/${bucket}/`,
  ];

  for (const marker of markers) {
    const idx = urlOrPath.indexOf(marker);
    if (idx !== -1) {
      const after = urlOrPath.slice(idx + marker.length);
      return after.split('?')[0]; // strip signed-URL query string
    }
  }

  return urlOrPath; // fallback — return as-is
}
