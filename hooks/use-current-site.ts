// Hook to get the current active site ID
'use client';

import { useSite } from '@/components/context/site-context';

/**
 * Hook to get the current site ID from context
 */
export function useCurrentSite() {
  const { siteId } = useSite();
  
  return {
    siteId,
    isLoading: !siteId,
  };
}
