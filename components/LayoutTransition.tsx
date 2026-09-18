'use client';

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import SiteFooter from './SiteFooter';
import SiteModalHost from './SiteModalHost';

export default function LayoutTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // The landing page should be visible in the initial server-rendered HTML.
  if (!pathname.startsWith('/admin')) {
    // Preserve the existing home/gallery composition while other pages use
    // the editorial design system's spacing and type scale.
    const protectedLayout = pathname === '/' || pathname === '/home' || pathname.startsWith('/gallery/');
    return <div className="public-site" data-layout={protectedLayout ? 'portfolio' : 'editorial'}>{children}{pathname !== '/' && <SiteFooter />}<SiteModalHost /></div>;
  }

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
