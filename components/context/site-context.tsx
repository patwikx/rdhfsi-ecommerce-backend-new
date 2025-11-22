// context/site-context.tsx
'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface SiteContextType {
  siteId: string | null;
  setSiteId: (id: string) => void;
}

const SiteContext = createContext<SiteContextType | null>(null);

export function useSite() {
  const context = useContext(SiteContext);
  if (!context) {
    throw new Error('useSite must be used within a SiteProvider');
  }
  return context;
}

export function SiteProvider({ children, siteId: initialSiteId }: { children: React.ReactNode; siteId: string | null }) {
  const [siteId, setSiteId] = useState<string | null>(initialSiteId);

  // Sync with localStorage
  useEffect(() => {
    const stored = localStorage.getItem('activeSiteId');
    if (stored) {
      setSiteId(stored);
    } else if (initialSiteId) {
      setSiteId(initialSiteId);
      localStorage.setItem('activeSiteId', initialSiteId);
    }
  }, [initialSiteId]);

  const handleSetSiteId = (id: string) => {
    setSiteId(id);
    localStorage.setItem('activeSiteId', id);
  };

  return (
    <SiteContext.Provider value={{ siteId, setSiteId: handleSetSiteId }}>
      {children}
    </SiteContext.Provider>
  );
}