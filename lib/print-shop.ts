/**
 * Server-only reads for the print shop. Everything here is public data, read
 * with the anon key and no session, so it behaves the same for every visitor.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { PrintSize, SoldBySize } from '@/types';

let _client: SupabaseClient | null = null;

export function publicClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }
  return _client;
}

function toSize(row: Record<string, unknown>): PrintSize {
  return {
    id: String(row.id),
    name: String(row.name),
    dimensions: String(row.dimensions ?? ''),
    price_usd: row.price_usd === null || row.price_usd === undefined ? null : Number(row.price_usd),
    edition_size: Number(row.edition_size),
    sort_order: Number(row.sort_order),
    active: Boolean(row.active),
  };
}

/** Active sizes in display order. Empty if the shop cannot be read. */
export async function getPrintSizes(): Promise<PrintSize[]> {
  try {
    const { data, error } = await publicClient()
      .from('print_sizes')
      .select('id, name, dimensions, price_usd, edition_size, sort_order, active')
      .eq('active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toSize);
  } catch (err) {
    console.error('[print-shop] could not load print sizes:', err);
    return [];
  }
}

/** Sold counts per photograph, keyed by image id then size id. */
export async function getSoldCounts(imageIds: string[]): Promise<Record<string, SoldBySize>> {
  const sold: Record<string, SoldBySize> = {};
  if (imageIds.length === 0) return sold;
  try {
    const { data, error } = await publicClient()
      .from('print_sales')
      .select('image_id, size_id, sold')
      .in('image_id', imageIds);
    if (error) throw error;
    for (const row of data ?? []) {
      (sold[row.image_id] ??= {})[row.size_id] = Number(row.sold);
    }
  } catch (err) {
    console.error('[print-shop] could not load sold counts:', err);
  }
  return sold;
}

/** The editable prints page text: headings and one list item per line. */
export async function getPrintsPageContent(): Promise<Record<string, string>> {
  try {
    const { data, error } = await publicClient()
      .from('page_content')
      .select('key, value')
      .eq('page', 'prints');
    if (error) throw error;
    return Object.fromEntries((data ?? []).map((row) => [row.key, row.value ?? '']));
  } catch (err) {
    console.error('[print-shop] could not load prints page content:', err);
    return {};
  }
}

export function listItems(value: string | undefined): string[] {
  return (value ?? '').split('\n').map((item) => item.trim()).filter(Boolean);
}
