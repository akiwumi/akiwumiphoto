import Link from 'next/link';
import styles from './SiteChrome.module.css';

export default function SiteFooter({ contained = false }: { contained?: boolean }) {
  return (
    <footer className={`${styles.footer} ${contained ? styles.contained : ''}`}>
      <span>Eugene Akiwumi · Stockholm</span>
      <nav aria-label="More about Akiwumi Photo">
        <Link href="/videography">Film</Link>
        <Link href="/about">About</Link>
        <Link href="/prints">Prints</Link>
        <Link href="/news">News</Link>
        <Link href="/contact">Contact</Link>
      </nav>
    </footer>
  );
}
