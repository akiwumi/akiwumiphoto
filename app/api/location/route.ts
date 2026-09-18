import { NextResponse } from 'next/server';
import { currencyForCountry } from '@/lib/regions';

export function GET(request: Request) {
  // Vercel is the primary deployment, but keep detection portable for
  // previews, proxies and other hosts that expose a different country header.
  const country = request.headers.get('x-vercel-ip-country')
    ?? request.headers.get('cf-ipcountry')
    ?? request.headers.get('cloudfront-viewer-country')
    ?? request.headers.get('x-country-code');
  return NextResponse.json({ currency: currencyForCountry(country) }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
