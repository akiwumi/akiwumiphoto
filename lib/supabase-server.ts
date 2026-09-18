import { createServerClient as createSSRServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { CookieOptions } from '@supabase/ssr';

export type SupabaseAuthCookie = { name: string; value: string; options: CookieOptions };

export function applySupabaseAuthCookies(response: Response, authCookies: SupabaseAuthCookie[]) {
  const responseWithCookies = response as Response & { cookies?: { set: (name: string, value: string, options?: CookieOptions) => void } };
  if (!responseWithCookies.cookies) return;
  for (const { name, value, options } of authCookies) responseWithCookies.cookies.set(name, value, options);
}

const PLACEHOLDER = ['your-project', 'your-anon', 'your-service'];

function isConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return (
    url.startsWith('https://') &&
    !PLACEHOLDER.some((p) => url.includes(p)) &&
    key.length > 20 &&
    !PLACEHOLDER.some((p) => key.includes(p))
  );
}

export async function createServerClient(options: { onSetAll?: (cookiesToSet: SupabaseAuthCookie[]) => void } = {}) {
  if (!isConfigured()) {
    throw new Error('Supabase not configured — using demo data');
  }
  const cookieStore = await cookies();
  return createSSRServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Route handlers need to attach these values to their own response;
          // capture them even if the async request cookie store is immutable.
          options.onSetAll?.(cookiesToSet);
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server components cannot set cookies — proxy.ts handles refresh
          }
        },
      },
    }
  );
}
