import { createBrowserClient } from '@supabase/auth-helpers-nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';

const PLACEHOLDER = ['your-project', 'your-anon'];

let browserClient: SupabaseClient | null = null;

export function isSupabaseBrowserConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  return (
    url.startsWith('https://') &&
    !PLACEHOLDER.some((p) => url.includes(p) || key.includes(p)) &&
    key.length > 20
  );
}

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!isSupabaseBrowserConfigured()) {
    throw new Error('Supabase browser client is not configured');
  }

  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }

  return browserClient;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, property, receiver) {
    return Reflect.get(getSupabaseBrowserClient(), property, receiver);
  },
});
