import type { Metadata } from 'next';

// The contact page is a client component, so its metadata lives here.
export const metadata: Metadata = {
  title: 'Contact Eugene Akiwumi | Commissions, Prints & Press',
  description: 'Get in touch with Stockholm photographer and filmmaker Eugene Akiwumi about commissions, prints, collaborations and press.',
  alternates: { canonical: '/contact' },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
