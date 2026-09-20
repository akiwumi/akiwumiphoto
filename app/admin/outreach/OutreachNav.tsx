'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Outreach.module.css';

const links = [
  ['Overview', '/admin/outreach'],
  ['Address book', '/admin/outreach/contacts'],
  ['Sent', '/admin/outreach/sent'],
  ['Review email', '/admin/outreach/campaigns/new/review'],
  ['Import', '/admin/outreach/import'],
  ['Campaigns', '/admin/outreach/campaigns'],
  ['New campaign', '/admin/outreach/campaigns/new'],
] as const;

export default function OutreachNav() {
  const pathname = usePathname();
  return <nav className={styles.outreachNav} aria-label="Outreach navigation">
    <span className={styles.outreachNavLabel}>Outreach</span>
    <div className={styles.outreachNavLinks}>{links.map(([label, href]) => {
      const active = href === '/admin/outreach' ? pathname === href : pathname.startsWith(href);
      return <Link key={href} className={`${styles.outreachNavLink} ${active ? styles.outreachNavLinkActive : ''}`} href={href} aria-current={active ? 'page' : undefined}>{label}</Link>;
    })}</div>
  </nav>;
}
