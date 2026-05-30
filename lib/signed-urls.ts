/**
 * Server-only helpers for generating 1-hour signed URLs from the
 * gallery-images private bucket.  Import only in server components
 * or Route Handlers — never in 'use client' files.
 */
import { createServiceClient } from './supabase-service';
import { extractStoragePath } from './storage-utils';

const BUCKET = 'gallery-images';
const TTL_SECONDS = 60 * 60; // 1 hour

/** Sign a single storage path / URL. Returns the original value on failure. */
export async function signUrl(pathOrUrl: string | null | undefined): Promise<string | null> {
  if (!pathOrUrl) return null;
  const supabase = createServiceClient();
  const path = extractStoragePath(pathOrUrl, BUCKET);
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, TTL_SECONDS);
  if (error || !data) return pathOrUrl;
  return data.signedUrl;
}

/**
 * Sign the storage_path on each item in an array.
 * Returns the same array shape with storage_path replaced by a signed URL.
 */
export async function signItems<T extends { storage_path: string }>(items: T[]): Promise<T[]> {
  if (items.length === 0) return items;
  const signed = await Promise.all(items.map((item) => signUrl(item.storage_path)));
  return items.map((item, i) => ({ ...item, storage_path: signed[i] ?? item.storage_path }));
}
