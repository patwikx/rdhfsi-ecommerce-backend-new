// Hook to get the current active site ID
'use client';

import { useActiveSite } from './use-active-site';
import { useSite } from '@/components/context/site-context';

/**
 * Hook to get the current site ID
 * Prioritizes client-side active site, falls back to server-side context
 */
export function useCurrentSite() {
  const activeSite = useActiveSite();
  const { siteId } = useSite();
  
  const currentSiteId = activeSite.id || siteId;
  
  return {
    siteId: currentSiteId,
    isLoading: !currentSiteId,
  };
}
