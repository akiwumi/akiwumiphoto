'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { NavPage } from '@/types';

const HiddenPagesContext = createContext<string[]>([]);
const NavPagesContext = createContext<NavPage[]>([]);

/** Hidden page keys (lib/site-visibility.ts) and created menu pages (lib/site-pages.ts), read once per request in the root layout. */
export function SiteVisibilityProvider({ hidden, navPages, children }: { hidden: string[]; navPages: NavPage[]; children: ReactNode }) {
  return (
    <HiddenPagesContext.Provider value={hidden}>
      <NavPagesContext.Provider value={navPages}>{children}</NavPagesContext.Provider>
    </HiddenPagesContext.Provider>
  );
}

/** Pages the admin created and put in the menu. */
export function useNavPages(): NavPage[] {
  return useContext(NavPagesContext);
}

/** True unless the admin has hidden this page. */
export function useIsPageShown(): (key: string) => boolean {
  const hidden = useContext(HiddenPagesContext);
  return (key) => !hidden.includes(key);
}
