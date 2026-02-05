// Utility functions for filtering data by site
import type { Prisma } from '@prisma/client';

/**
 * Add site filter to Prisma where clause
 * Use this in server actions and API routes
 */
export function withSiteFilter<T extends Record<string, any>>(
  where: T,
  siteId: string | null | undefined
): T {
  if (!siteId) return where;
  
  return {
    ...where,
    siteId,
  } as T;
}

/**
 * Add site filter for inventory queries
 * Filters by inventory.siteId
 */
export function withInventorySiteFilter<T extends Record<string, any>>(
  where: T,
  siteId: string | null | undefined
): T {
  if (!siteId) return where;
  
  return {
    ...where,
    inventory: {
      some: {
        siteId,
      },
    },
  } as T;
}

/**
 * Create a site-aware Prisma where clause
 * Example: getSiteWhere(siteId, { status: 'ACTIVE' })
 */
export function getSiteWhere<T extends Record<string, any>>(
  siteId: string | null | undefined,
  additionalWhere?: T
): T & { siteId?: string } {
  const baseWhere = additionalWhere || ({} as T);
  
  if (!siteId) return baseWhere;
  
  return {
    ...baseWhere,
    siteId,
  };
}

/**
 * Check if a model has siteId field
 * Useful for conditional filtering
 */
export function hasSiteField(modelName: string): boolean {
  const modelsWithSite = [
    'Inventory',
    'InventoryMovement',
    'StockTransfer',
    'StockTransferItem',
  ];
  
  return modelsWithSite.includes(modelName);
}

/**
 * Get site filter for related models
 * Example: For Product -> Inventory relationship
 */
export function getRelatedSiteFilter(siteId: string | null | undefined) {
  if (!siteId) return {};
  
  return {
    inventories: {
      some: {
        siteId,
      },
    },
  };
}
