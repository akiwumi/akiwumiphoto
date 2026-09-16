'use client';

import { createContext, useContext, type ReactNode } from 'react';

const HiddenPagesContext = createContext<string[]>([]);

/** Hidden page keys from lib/site-visibility.ts, read once per request in the root layout. */
export function SiteVisibilityProvider({ hidden, children }: { hidden: string[]; children: ReactNode }) {
  return <HiddenPagesContext.Provider value={hidden}>{children}</HiddenPagesContext.Provider>;
}

/** True unless the admin has hidden this page. */
export function useIsPageShown(): (key: string) => boolean {
  const hidden = useContext(HiddenPagesContext);
  return (key) => !hidden.includes(key);
}
