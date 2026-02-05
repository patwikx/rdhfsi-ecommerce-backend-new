'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { headers } from 'next/headers';

interface LogActivityParams {
  action: string;
  description?: string;
  metadata?: Record<string, unknown>;
  userId?: string; // Optional - will use session user if not provided
}

/**
 * Log user activity to the database
 */
export async function logActivity(params: LogActivityParams): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { action, description, metadata, userId: providedUserId } = params;

    // Get user from session if not provided
    let userId = providedUserId;
    if (!userId) {
      const session = await auth();
      if (!session?.user?.id) {
        // Don't log if no user (guest users)
        return { success: true }; // Silent success for guests
      }
      userId = session.user.id;
    }

    // Get request headers for IP and user agent
    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || null;
    const userAgent = headersList.get('user-agent') || null;

    // Create activity log
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        description,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
        ipAddress,
        userAgent,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error logging activity:', error);
    return { success: false, error: 'Failed to log activity' };
  }
}

/**
 * Log search activity
 */
export async function logSearch(params: {
  query: string;
  filters?: {
    categoryId?: string;
    brandId?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
  };
  resultsCount: number;
}): Promise<{ success: boolean; error?: string }> {
  return logActivity({
    action: 'SEARCH',
    description: `Searched for: "${params.query}"`,
    metadata: {
      query: params.query,
      filters: params.filters,
      resultsCount: params.resultsCount,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log product view
 */
export async function logProductView(params: {
  productId: string;
  productName: string;
  productSlug: string;
}): Promise<{ success: boolean; error?: string }> {
  return logActivity({
    action: 'VIEW_PRODUCT',
    description: `Viewed product: ${params.productName}`,
    metadata: {
      productId: params.productId,
      productName: params.productName,
      productSlug: params.productSlug,
    },
  });
}

/**
 * Log brand view
 */
export async function logBrandView(params: {
  brandId: string;
  brandName: string;
  brandSlug: string;
}): Promise<{ success: boolean; error?: string }> {
  return logActivity({
    action: 'VIEW_BRAND',
    description: `Viewed brand: ${params.brandName}`,
    metadata: {
      brandId: params.brandId,
      brandName: params.brandName,
      brandSlug: params.brandSlug,
    },
  });
}

/**
 * Log category view
 */
export async function logCategoryView(params: {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
}): Promise<{ success: boolean; error?: string }> {
  return logActivity({
    action: 'VIEW_CATEGORY',
    description: `Viewed category: ${params.categoryName}`,
    metadata: {
      categoryId: params.categoryId,
      categoryName: params.categoryName,
      categorySlug: params.categorySlug,
    },
  });
}

/**
 * Get popular searches (most searched terms)
 */
export async function getPopularSearches(limit: number = 10): Promise<{
  success: boolean;
  searches?: { query: string; count: number }[];
  error?: string;
}> {
  try {
    const logs = await prisma.activityLog.findMany({
      where: {
        action: 'SEARCH',
      },
      select: {
        metadata: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1000, // Get last 1000 searches
    });

    // Count search queries
    const searchCounts = new Map<string, number>();
    
    logs.forEach((log) => {
      if (log.metadata && typeof log.metadata === 'object' && 'query' in log.metadata) {
        const query = (log.metadata as { query?: string }).query;
        if (query && typeof query === 'string' && query.trim().length > 0) {
          const normalizedQuery = query.toLowerCase().trim();
          searchCounts.set(normalizedQuery, (searchCounts.get(normalizedQuery) || 0) + 1);
        }
      }
    });

    // Convert to array and sort by count
    const searches = Array.from(searchCounts.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return { success: true, searches };
  } catch (error) {
    console.error('Error getting popular searches:', error);
    return { success: false, error: 'Failed to get popular searches' };
  }
}

/**
 * Get trending products (most viewed)
 */
export async function getTrendingProducts(limit: number = 10): Promise<{
  success: boolean;
  products?: { productId: string; productName: string; viewCount: number }[];
  error?: string;
}> {
  try {
    const logs = await prisma.activityLog.findMany({
      where: {
        action: 'VIEW_PRODUCT',
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      select: {
        metadata: true,
      },
    });

    // Count product views
    const productCounts = new Map<string, { name: string; count: number }>();
    
    logs.forEach((log) => {
      if (log.metadata && typeof log.metadata === 'object') {
        const meta = log.metadata as { productId?: string; productName?: string };
        if (meta.productId && meta.productName) {
          const existing = productCounts.get(meta.productId);
          if (existing) {
            existing.count++;
          } else {
            productCounts.set(meta.productId, { name: meta.productName, count: 1 });
          }
        }
      }
    });

    // Convert to array and sort by count
    const products = Array.from(productCounts.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        viewCount: data.count,
      }))
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, limit);

    return { success: true, products };
  } catch (error) {
    console.error('Error getting trending products:', error);
    return { success: false, error: 'Failed to get trending products' };
  }
}
