// context/site-context.tsx
'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface SiteContextType {
  siteId: string | null;
  setSiteId: (id: string) => void;
  isSwitching: boolean;
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
  const [isSwitching, setIsSwitching] = useState(false);

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

  // Prevent body scroll when switching
  useEffect(() => {
    if (isSwitching) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isSwitching]);

  const handleSetSiteId = (id: string) => {
    setIsSwitching(true);
    setSiteId(id);
    localStorage.setItem('activeSiteId', id);
    
    // Keep loading state for a bit to show the animation
    setTimeout(() => {
      setIsSwitching(false);
    }, 800);
  };

  return (
    <SiteContext.Provider value={{ siteId, setSiteId: handleSetSiteId, isSwitching }}>
      {children}
      
      {/* Loading Overlay */}
      {isSwitching && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-lg font-semibold">Switching Sites...</p>
              <p className="text-sm text-muted-foreground">Please wait</p>
            </div>
          </div>
        </div>
      )}
    </SiteContext.Provider>
  );
}