'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState, type ComponentType } from 'react';
import { Briefcase, Clapperboard, FileText, Frame, Images, Mail, Menu, Newspaper, ShoppingBag, User, X } from 'lucide-react';
import styles from './SiteChrome.module.css';
import { useBasketCount } from '@/lib/basket-store';
import { supabase } from '@/lib/supabase';
import { useIsPageShown, useNavPages } from './SiteVisibility';

type NavItem = {
  key: string;
  href: string;
  label: string;
  Icon: ComponentType<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean }>;
  current: boolean;
};

/** How many links fit in the mobile bottom bar beside the menu button. */
const BAR_SLOTS = 4;
/** Pages that earn a bottom-bar slot first; everything else goes in the menu. */
const BAR_PRIORITY = ['gallery', 'videography', 'prints', 'basket'];

export default function NavBar({ contained = false }: { contained?: boolean }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const basketCount = useBasketCount();
  const shown = useIsPageShown();
  const navPages = useNavPages();

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setSignedIn(Boolean(data.user?.email_confirmed_at));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session?.user?.email_confirmed_at));
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const items: NavItem[] = [
    { key: 'gallery', href: '/home', label: 'Gallery', Icon: Images, current: pathname === '/home' || pathname.startsWith('/gallery/') },
    { key: 'videography', href: '/videography', label: 'Film', Icon: Clapperboard, current: pathname === '/videography' },
    { key: 'services', href: '/#services', label: 'Services', Icon: Briefcase, current: false },
    { key: 'prints', href: '/prints', label: 'Prints', Icon: Frame, current: pathname === '/prints' },
    { key: 'news', href: '/news', label: 'News', Icon: Newspaper, current: pathname === '/news' },
    ...navPages.map((page) => ({ key: `page:${page.slug}`, href: `/${page.slug}`, label: page.title, Icon: FileText, current: pathname === `/${page.slug}` })),
    { key: 'about', href: '/about', label: 'About', Icon: User, current: pathname === '/about' },
    { key: 'contact', href: '/contact', label: 'Contact', Icon: Mail, current: pathname === '/contact' },
    ...(basketCount > 0 ? [{ key: 'basket', href: '/basket', label: 'Basket', Icon: ShoppingBag, current: pathname === '/basket' }] : []),
    ...(signedIn ? [{ key: 'account', href: '/account', label: 'Account', Icon: User, current: pathname === '/account' }] : [{ key: 'login', href: '/account?mode=login', label: 'Login', Icon: User, current: false }]),
  ].filter((item) => item.key.startsWith('page:') || shown(item.key));

  // Fill the bar in priority order, topping up from the remaining pages when some are hidden.
  const ranked = [...items].sort((a, b) => rank(a.key) - rank(b.key));
  const barKeys = new Set(ranked.slice(0, BAR_SLOTS).map((item) => item.key));
  const barItems = items.filter((item) => barKeys.has(item.key));
  const menuItems = items.filter((item) => !barKeys.has(item.key));

  const basketLabel = basketCount > 0 ? `Basket, ${basketCount} ${basketCount === 1 ? 'print' : 'prints'}` : 'Basket';
  const menuCurrent = menuItems.some((item) => item.current);
  const signOut = async () => {
    await supabase.auth.signOut();
    setSignedIn(false);
    setMenuOpen(false);
  };

  return (
    <>
      <header className={`${styles.header} ${contained ? styles.contained : ''}`}>
        <Link href="/" className={styles.wordmark}>Akiwumi Photo</Link>
        <nav aria-label="Main navigation" className={styles.navigation}>
          {items.map((item) => (
            <Link key={item.key} href={item.href} aria-current={item.current ? 'page' : undefined}
              className={item.key === 'login' || item.key === 'register-account' ? styles.accountAction : undefined}
              aria-label={item.key === 'basket' ? basketLabel : undefined}>
              {item.key === 'basket' ? <><ShoppingBag size={18} strokeWidth={1.8} aria-hidden /><span className={styles.srOnly}>Basket</span><span className={styles.basketCount} aria-hidden="true">{basketCount}</span></> : item.label}
            </Link>
          ))}
          {signedIn && <button type="button" onClick={signOut} style={{ background: 'none', border: 0, color: 'inherit', cursor: 'pointer', font: 'inherit', padding: 0 }}>Sign out</button>}
        </nav>
      </header>

      {/* Mobile only: an app-style tab bar pinned to the bottom of the screen. */}
      <div className={styles.tabBarRoot}>
        {menuOpen && <div className={styles.menuScrim} onClick={() => setMenuOpen(false)} aria-hidden="true" />}
        {menuOpen && (
          <nav id={menuId} aria-label="More pages" className={styles.menuSheet} onClick={() => setMenuOpen(false)}>
            {menuItems.map(({ key, href, label, Icon, current }) => (
              <Link key={key} href={href} className={key === 'login' || key === 'register-account' ? styles.accountAction : undefined} aria-current={current ? 'page' : undefined}>
                <Icon size={20} strokeWidth={1.5} aria-hidden />
                <span>{label}</span>
              </Link>
            ))}
            {signedIn && <button type="button" onClick={signOut} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 0, color: 'inherit', cursor: 'pointer', font: 'inherit', padding: '12px 16px', width: '100%', textAlign: 'left' }}><User size={20} strokeWidth={1.5} aria-hidden /><span>Sign out</span></button>}
          </nav>
        )}
        <nav aria-label="Mobile navigation" className={styles.tabBar}>
          {barItems.map(({ key, href, label, Icon, current }) => (
            <Link key={key} href={href} className={styles.tab} aria-current={current ? 'page' : undefined}
              aria-label={key === 'basket' ? basketLabel : undefined}>
              <span className={styles.tabIcon}>
                <Icon size={22} strokeWidth={1.5} aria-hidden />
                {key === 'basket' && basketCount > 0 && <span className={styles.tabBadge} aria-hidden="true">{basketCount}</span>}
              </span>
              <span className={styles.tabLabel}>{label}</span>
            </Link>
          ))}
          {menuItems.length > 0 && (
            <button ref={toggleRef} type="button" className={styles.tab}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen} aria-controls={menuId}
              data-current={menuCurrent || undefined}
              onClick={() => setMenuOpen(!menuOpen)}>
              <span className={styles.tabIcon}>
                {menuOpen ? <X size={22} strokeWidth={1.5} aria-hidden /> : <Menu size={22} strokeWidth={1.5} aria-hidden />}
              </span>
              <span className={styles.tabLabel} aria-hidden="true">Menu</span>
            </button>
          )}
        </nav>
      </div>
    </>
  );
}

function rank(key: string) {
  const index = BAR_PRIORITY.indexOf(key);
  return index === -1 ? BAR_PRIORITY.length : index;
}
