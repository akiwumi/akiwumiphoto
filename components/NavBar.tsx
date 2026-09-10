'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useId, useRef, useState } from 'react';
import styles from './SiteChrome.module.css';

export default function NavBar({ contained = false }: { contained?: boolean }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  return (
    <header className={`${styles.header} ${contained ? styles.contained : ''}`}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && menuOpen) {
          setMenuOpen(false);
          toggleRef.current?.focus();
        }
      }}>
      <Link href="/" className={styles.wordmark}>Akiwumi Photo</Link>
      <button ref={toggleRef} type="button" className={styles.menuToggle}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen} aria-controls={menuId}
        onClick={() => setMenuOpen(!menuOpen)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
        </svg>
      </button>
      <nav id={menuId} aria-label="Main navigation" className={`${styles.navigation} ${menuOpen ? styles.open : ''}`}
        onClick={() => setMenuOpen(false)}>
        <Link href="/home" aria-current={pathname === '/home' || pathname.startsWith('/gallery/') ? 'page' : undefined}>Projects</Link>
        <Link href="/#services">Services</Link>
        <Link href="/prints" aria-current={pathname === '/prints' ? 'page' : undefined}>Prints</Link>
        <Link href="/about" aria-current={pathname === '/about' ? 'page' : undefined}>About</Link>
        <Link href="/contact" aria-current={pathname === '/contact' ? 'page' : undefined}>Contact</Link>
      </nav>
    </header>
  );
}
