// Example component showing how to use the site context and active site
'use client';

import { useSite } from '@/components/context/site-context';
import { useActiveSite } from '@/hooks/use-active-site';

export function SiteUsageExample() {
  // Get site from context (server-side initial value)
  const { siteId } = useSite();
  
  // Get active site from zustand store (client-side switching)
  const activeSite = useActiveSite();
  
  // Use activeSite.id for the current selected site
  const currentSiteId = activeSite.id || siteId;
  
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-2">Current Site</h3>
      <p className="text-sm text-muted-foreground">
        Site ID: {currentSiteId || 'No site selected'}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        This will update when you switch sites using the sidebar
      </p>
    </div>
  );
}

// Example: Fetching inventory for the active site
export function InventoryBySite() {
  const activeSite = useActiveSite();
  const currentSiteId = activeSite.id;
  
  // Use currentSiteId in your queries
  // Example: const { data } = useQuery(['inventory', currentSiteId], ...)
  
  return (
    <div>
      <h3>Inventory for Site: {currentSiteId}</h3>
      {/* Your inventory display here */}
    </div>
  );
}
