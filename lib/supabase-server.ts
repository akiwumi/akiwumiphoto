import { createServerClient as createSSRServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

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

export async function createServerClient() {
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
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server components cannot set cookies — middleware handles refresh
          }
        },
      },
    }
  );
}
