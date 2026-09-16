'use client';

import { supabase } from '@/lib/supabase';
import type { BlockImage } from '@/lib/page-blocks';

/** Longest edge kept after upload; larger photos are scaled down in the browser first. */
const MAX_EDGE = 2400;
const QUALITY = 0.86;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Scales a photograph to at most MAX_EDGE pixels, re-encodes it (WebP where
 * the browser can, JPEG otherwise) and uploads it to the public photography
 * bucket. Returns its URL and dimensions. Next's image optimiser then serves
 * each visitor a size that fits their screen.
 */
export async function uploadPageImage(file: File): Promise<BlockImage> {
  if (!ACCEPTED.includes(file.type)) throw new Error('Use a JPG, PNG or WebP image.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot prepare images.');
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));
  let blob = await encode('image/webp');
  // Browsers that can't write WebP silently fall back to PNG; JPEG is far smaller.
  if (!blob || blob.type !== 'image/webp') blob = await encode('image/jpeg');
  if (!blob) throw new Error('Could not prepare the image.');
  // Keep the original if it was already smaller and needed no resizing.
  const upload = scale === 1 && file.size < blob.size && file.type !== 'image/png' ? file : blob;

  const ext = upload.type === 'image/webp' ? 'webp' : upload.type === 'image/png' ? 'png' : 'jpg';
  const path = `pages/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { data, error } = await supabase.storage.from('photography')
    .upload(path, upload, { cacheControl: '31536000', contentType: upload.type, upsert: false });
  if (error || !data) throw new Error(`Upload failed: ${error?.message ?? 'unknown error'}`);

  return { url: supabase.storage.from('photography').getPublicUrl(data.path).data.publicUrl, width, height, alt: '' };
}
