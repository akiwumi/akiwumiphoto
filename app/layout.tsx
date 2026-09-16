import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Bebas_Neue } from 'next/font/google';
import './globals.css';
import './site-design.css';
import LayoutTransition from '@/components/LayoutTransition';
import SiteAnalytics from '@/components/SiteAnalytics';
import { SITE_URL } from '@/lib/site-origin';
import { connection } from 'next/server';
import { fetchHiddenPages } from '@/lib/site-visibility';
import { fetchNavPages } from '@/lib/site-pages';
import { SiteVisibilityProvider } from '@/components/SiteVisibility';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-bebas',
  display: 'swap',
});

// The shared-link image comes from app/opengraph-image.jpg; gallery pages
// swap in their own cover photograph.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'AKIWUMI PHOTO',
  description: 'Photography portfolio — fine art prints, galleries, and videography.',
  openGraph: {
    title: 'AKIWUMI PHOTO',
    description: 'Photography portfolio — fine art prints, galleries, and videography.',
    type: 'website',
    siteName: 'Akiwumi Photo',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

// viewport-fit=cover exposes env(safe-area-inset-*) to the mobile bottom tab bar.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#000',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read per request so hiding a page in the admin applies without a redeploy.
  await connection();
  const [hiddenPages, navPages] = await Promise.all([fetchHiddenPages(), fetchNavPages()]);

  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${bebasNeue.variable}`}>
      <body className="bg-black text-white min-h-dvh antialiased" style={{ fontFamily: 'var(--font-space-grotesk), Helvetica Neue, Arial, sans-serif' }}>
        <SiteVisibilityProvider hidden={hiddenPages} navPages={navPages}>
          <LayoutTransition>
            {children}
          </LayoutTransition>
        </SiteVisibilityProvider>
        <SiteAnalytics />
      </body>
    </html>
  );
}
