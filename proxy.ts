import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { fetchHiddenPages, hiddenPageFor } from '@/lib/site-visibility';

// Hidden pages are looked up at most this often per server instance, so
// hiding or showing a page in the admin applies within this many seconds.
const HIDDEN_PAGES_TTL_MS = 15_000;
let hiddenCache: { pages: string[]; at: number } | null = null;

async function hiddenPages(): Promise<string[]> {
  if (!hiddenCache || Date.now() - hiddenCache.at > HIDDEN_PAGES_TTL_MS) {
    hiddenCache = { pages: await fetchHiddenPages(), at: Date.now() };
  }
  return hiddenCache.pages;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // A page the admin has hidden answers as if it didn't exist.
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/register') && !pathname.startsWith('/account')) {
    if (hiddenPageFor(pathname, await hiddenPages())) {
      return NextResponse.rewrite(new URL('/__hidden-page', request.url), { status: 404 });
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — keeps the cookie up to date on every request
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    '/admin/:path*', '/register/:path*', '/account/:path*',
    '/home', '/gallery/:path*', '/videography', '/prints', '/news', '/about', '/contact', '/basket',
  ],
};
