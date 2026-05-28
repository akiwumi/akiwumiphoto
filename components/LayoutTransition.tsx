'use client';

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

export default function LayoutTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
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
