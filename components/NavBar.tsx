'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useId, useRef, useState } from 'react';
import styles from './SiteChrome.module.css';
import { useBasketCount } from '@/lib/basket-store';
import { useIsPageShown, useNavPages } from './SiteVisibility';

export default function NavBar({ contained = false }: { contained?: boolean }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const basketCount = useBasketCount();
  const shown = useIsPageShown();
  const navPages = useNavPages();
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
        {shown('gallery') && <Link href="/home" aria-current={pathname === '/home' || pathname.startsWith('/gallery/') ? 'page' : undefined}>Gallery</Link>}
        {shown('videography') && <Link href="/videography" aria-current={pathname === '/videography' ? 'page' : undefined}>Film</Link>}
        {shown('services') && <Link href="/#services">Services</Link>}
        {shown('prints') && <Link href="/prints" aria-current={pathname === '/prints' ? 'page' : undefined}>Prints</Link>}
        {shown('news') && <Link href="/news" aria-current={pathname === '/news' ? 'page' : undefined}>News</Link>}
        {navPages.map((page) => (
          <Link key={page.slug} href={`/${page.slug}`} aria-current={pathname === `/${page.slug}` ? 'page' : undefined}>{page.title}</Link>
        ))}
        {shown('about') && <Link href="/about" aria-current={pathname === '/about' ? 'page' : undefined}>About</Link>}
        {shown('contact') && <Link href="/contact" aria-current={pathname === '/contact' ? 'page' : undefined}>Contact</Link>}
        {shown('basket') && (
          <Link href="/basket" aria-current={pathname === '/basket' ? 'page' : undefined}
            aria-label={basketCount > 0 ? `Basket, ${basketCount} ${basketCount === 1 ? 'print' : 'prints'}` : 'Basket'}>
            Basket{basketCount > 0 && <span className={styles.basketCount} aria-hidden="true">{basketCount}</span>}
          </Link>
        )}
      </nav>
    </header>
  );
}
