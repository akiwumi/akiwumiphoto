import type { Metadata } from 'next';
import { Space_Grotesk, Bebas_Neue } from 'next/font/google';
import './globals.css';
import { AudioProvider } from '@/contexts/AudioContext';
import MusicToggle from '@/components/MusicToggle';

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

export const metadata: Metadata = {
  title: 'AKIWUMI PHOTO',
  description: 'Photography portfolio — fine art prints, galleries, and videography.',
  openGraph: {
    title: 'AKIWUMI PHOTO',
    description: 'Photography portfolio — fine art prints, galleries, and videography.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${bebasNeue.variable}`}>
      <body className="bg-black text-white min-h-dvh antialiased" style={{ fontFamily: 'var(--font-space-grotesk), Helvetica Neue, Arial, sans-serif' }}>
        <AudioProvider>
          {children}
          <MusicToggle />
        </AudioProvider>
      </body>
    </html>
  );
}
