// context/site-context.tsx
'use client';

import { createContext, useContext } from 'react';

interface SiteContextType {
  siteId: string | null;
}

const SiteContext = createContext<SiteContextType | null>(null);

export function useSite() {
  const context = useContext(SiteContext);
  if (!context) {
    throw new Error('useSite must be used within a SiteProvider');
  }
  return context;
}

export function SiteProvider({ children, siteId }: { children: React.ReactNode; siteId: string | null }) {
  return (
    <SiteContext.Provider value={{ siteId }}>
      {children}
    </SiteContext.Provider>
  );
}