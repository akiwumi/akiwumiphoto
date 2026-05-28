'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const NAV_LINKS = [
  { href: '/home', label: 'Galleries' },
  { href: '/videography', label: 'Video' },
  { href: '/prints', label: 'Prints' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

// Pages with white/light backgrounds — nav needs to flip to dark
const LIGHT_PAGES = ['/prints', '/about', '/contact'];

export default function NavBar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isLight = LIGHT_PAGES.includes(pathname);

  const textColor = isLight ? '#000000' : '#FFFFFF';
  const hoverColor = '#E8001C';
  const navBg = isLight ? '#FFFFFF' : 'transparent';
  const navBorder = isLight ? '1px solid #000000' : 'none';

  return (
    <>
      {/* Nav bar */}
      <nav
        className="fixed top-0 z-[100] flex items-center justify-between nav-enter"
        style={{
          left: 60,
          right: 60,
          height: 48,
          paddingTop: 'env(safe-area-inset-top)',
          background: navBg,
          borderBottom: navBorder,
          transition: 'background-color 0.35s ease, border-color 0.35s ease',
        }}
      >
        {/* Wordmark — links to splash */}
        <Link
          href="/"
          className="font-medium uppercase transition-colors duration-150 nav-link"
          style={{
            color: textColor,
            fontSize: '0.875rem',
            letterSpacing: '0.12em',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = hoverColor)}
          onMouseLeave={(e) => (e.currentTarget.style.color = textColor)}
        >
          AKIWUMI PHOTO
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href || (link.href === '/home' && pathname.startsWith('/gallery'));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium uppercase transition-colors duration-150 nav-link ${isActive ? 'active' : ''}`}
                style={{
                  color: isActive ? '#E8001C' : textColor,
                  letterSpacing: '0.15em',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = hoverColor; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = textColor; }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden w-11 h-11 flex items-center justify-center transition-colors duration-150"
          style={{ color: textColor }}
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </nav>

      {/* Mobile overlay menu */}
      <div className={`nav-overlay ${menuOpen ? 'open' : ''}`}>
        <button
          className="absolute top-4 right-4 w-11 h-11 flex items-center justify-center text-white hover:text-red transition-colors"
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {NAV_LINKS.map((link, index) => {
          const isActive = pathname === link.href || (link.href === '/home' && pathname.startsWith('/gallery'));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={isActive ? 'active' : ''}
              onClick={() => setMenuOpen(false)}
              style={{ transitionDelay: menuOpen ? `${80 + index * 45}ms` : '0ms' }}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </>
  );
}
