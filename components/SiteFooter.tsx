'use client';

import Link from 'next/link';
import styles from './SiteChrome.module.css';
import { useIsPageShown, useNavPages } from './SiteVisibility';
import { useCookieConsent } from './CookieConsentProvider';

export default function SiteFooter({ contained = false }: { contained?: boolean }) {
  const shown = useIsPageShown();
  const navPages = useNavPages();
  const { openSettings } = useCookieConsent();
  return (
    <footer className={`${styles.footer} ${contained ? styles.contained : ''}`}>
      <span>Eugene Akiwumi · Stockholm</span>
      <nav aria-label="More about Akiwumi Photo">
        {shown('videography') && <Link href="/videography">Film</Link>}
        {shown('about') && <Link href="/about">About</Link>}
        {shown('prints') && <Link href="/prints">Prints</Link>}
        {shown('news') && <Link href="/news">News</Link>}
        {navPages.map((page) => <Link key={page.slug} href={`/${page.slug}`}>{page.title}</Link>)}
        {shown('contact') && <Link href="/contact">Contact</Link>}
        <button type="button" className={styles.footerAction} onClick={openSettings}>Cookie settings</button>
      </nav>
    </footer>
  );
}
