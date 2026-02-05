'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

interface ProductCollectionResult {
  products: {
    id: string;
    sku: string;
    name: string;
    slug: string;
    description: string | null;
    retailPrice: number;
    compareAtPrice: number | null;
    isOnSale: boolean;
    isFeatured: boolean;
    averageRating: number | null;
    reviewCount: number;
    category: {
      id: string;
      name: string;
      slug: string;
    };
    brand: {
      id: string;
      name: string;
      slug: string;
    } | null;
    images: {
      id: string;
      url: string;
      altText: string | null;
      isPrimary: boolean;
    }[];
  }[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

/**
 * Get trending products
 */
export async function getTrendingProducts(options?: {
  page?: number;
  limit?: number;
  sortBy?: 'newest' | 'price-asc' | 'price-desc' | 'popular';
}): Promise<{ success: boolean; data?: ProductCollectionResult; error?: string }> {
  try {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      isPublished: true,
      isTrending: true,
    };

    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };

    switch (options?.sortBy) {
      case 'price-asc':
        orderBy = { retailPrice: 'asc' };
        break;
      case 'price-desc':
        orderBy = { retailPrice: 'desc' };
        break;
      case 'popular':
        orderBy = { reviewCount: 'desc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          sku: true,
          name: true,
          slug: true,
          description: true,
          retailPrice: true,
          compareAtPrice: true,
          isOnSale: true,
          isFeatured: true,
          averageRating: true,
          reviewCount: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          images: {
            select: {
              id: true,
              url: true,
              altText: true,
              isPrimary: true,
            },
            orderBy: {
              sortOrder: 'asc',
            },
            take: 1,
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    const productsWithNumbers = products.map((product) => ({
      ...product,
      retailPrice: Number(product.retailPrice),
      compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
      averageRating: product.averageRating ? Number(product.averageRating) : null,
    }));

    return {
      success: true,
      data: {
        products: productsWithNumbers,
        totalCount,
        totalPages,
        currentPage: page,
      },
    };
  } catch (error) {
    console.error('Error fetching trending products:', error);
    return { success: false, error: 'Failed to fetch trending products' };
  }
}

/**
 * Get sale products
 */
export async function getSaleProducts(options?: {
  page?: number;
  limit?: number;
  sortBy?: 'newest' | 'price-asc' | 'price-desc' | 'discount';
}): Promise<{ success: boolean; data?: ProductCollectionResult; error?: string }> {
  try {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      isPublished: true,
      isOnSale: true,
    };

    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };

    switch (options?.sortBy) {
      case 'price-asc':
        orderBy = { retailPrice: 'asc' };
        break;
      case 'price-desc':
        orderBy = { retailPrice: 'desc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          sku: true,
          name: true,
          slug: true,
          description: true,
          retailPrice: true,
          compareAtPrice: true,
          isOnSale: true,
          isFeatured: true,
          averageRating: true,
          reviewCount: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          images: {
            select: {
              id: true,
              url: true,
              altText: true,
              isPrimary: true,
            },
            orderBy: {
              sortOrder: 'asc',
            },
            take: 1,
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    const productsWithNumbers = products.map((product) => ({
      ...product,
      retailPrice: Number(product.retailPrice),
      compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
      averageRating: product.averageRating ? Number(product.averageRating) : null,
    }));

    return {
      success: true,
      data: {
        products: productsWithNumbers,
        totalCount,
        totalPages,
        currentPage: page,
      },
    };
  } catch (error) {
    console.error('Error fetching sale products:', error);
    return { success: false, error: 'Failed to fetch sale products' };
  }
}

/**
 * Get clearance products
 */
export async function getClearanceProducts(options?: {
  page?: number;
  limit?: number;
  sortBy?: 'newest' | 'price-asc' | 'price-desc';
}): Promise<{ success: boolean; data?: ProductCollectionResult; error?: string }> {
  try {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      isPublished: true,
      isClearance: true,
    };

    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };

    switch (options?.sortBy) {
      case 'price-asc':
        orderBy = { retailPrice: 'asc' };
        break;
      case 'price-desc':
        orderBy = { retailPrice: 'desc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          sku: true,
          name: true,
          slug: true,
          description: true,
          retailPrice: true,
          compareAtPrice: true,
          isOnSale: true,
          isFeatured: true,
          averageRating: true,
          reviewCount: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          images: {
            select: {
              id: true,
              url: true,
              altText: true,
              isPrimary: true,
            },
            orderBy: {
              sortOrder: 'asc',
            },
            take: 1,
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    const productsWithNumbers = products.map((product) => ({
      ...product,
      retailPrice: Number(product.retailPrice),
      compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
      averageRating: product.averageRating ? Number(product.averageRating) : null,
    }));

    return {
      success: true,
      data: {
        products: productsWithNumbers,
        totalCount,
        totalPages,
        currentPage: page,
      },
    };
  } catch (error) {
    console.error('Error fetching clearance products:', error);
    return { success: false, error: 'Failed to fetch clearance products' };
  }
}

/**
 * Get featured products
 */
export async function getFeaturedProducts(options?: {
  page?: number;
  limit?: number;
  sortBy?: 'newest' | 'price-asc' | 'price-desc' | 'popular';
}): Promise<{ success: boolean; data?: ProductCollectionResult; error?: string }> {
  try {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      isPublished: true,
      isFeatured: true,
    };

    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };

    switch (options?.sortBy) {
      case 'price-asc':
        orderBy = { retailPrice: 'asc' };
        break;
      case 'price-desc':
        orderBy = { retailPrice: 'desc' };
        break;
      case 'popular':
        orderBy = { reviewCount: 'desc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          sku: true,
          name: true,
          slug: true,
          description: true,
          retailPrice: true,
          compareAtPrice: true,
          isOnSale: true,
          isFeatured: true,
          averageRating: true,
          reviewCount: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          images: {
            select: {
              id: true,
              url: true,
              altText: true,
              isPrimary: true,
            },
            orderBy: {
              sortOrder: 'asc',
            },
            take: 1,
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    const productsWithNumbers = products.map((product) => ({
      ...product,
      retailPrice: Number(product.retailPrice),
      compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
      averageRating: product.averageRating ? Number(product.averageRating) : null,
    }));

    return {
      success: true,
      data: {
        products: productsWithNumbers,
        totalCount,
        totalPages,
        currentPage: page,
      },
    };
  } catch (error) {
    console.error('Error fetching featured products:', error);
    return { success: false, error: 'Failed to fetch featured products' };
  }
}

/**
 * Get new arrivals (products created in last 30 days)
 */
export async function getNewArrivals(options?: {
  page?: number;
  limit?: number;
  days?: number;
  sortBy?: 'newest' | 'price-asc' | 'price-desc' | 'popular';
}): Promise<{ success: boolean; data?: ProductCollectionResult; error?: string }> {
  try {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const days = options?.days || 30;
    const skip = (page - 1) * limit;

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      isPublished: true,
      createdAt: {
        gte: dateThreshold,
      },
    };

    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };

    switch (options?.sortBy) {
      case 'price-asc':
        orderBy = { retailPrice: 'asc' };
        break;
      case 'price-desc':
        orderBy = { retailPrice: 'desc' };
        break;
      case 'popular':
        orderBy = { reviewCount: 'desc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          sku: true,
          name: true,
          slug: true,
          description: true,
          retailPrice: true,
          compareAtPrice: true,
          isOnSale: true,
          isFeatured: true,
          averageRating: true,
          reviewCount: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          images: {
            select: {
              id: true,
              url: true,
              altText: true,
              isPrimary: true,
            },
            orderBy: {
              sortOrder: 'asc',
            },
            take: 1,
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    const productsWithNumbers = products.map((product) => ({
      ...product,
      retailPrice: Number(product.retailPrice),
      compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
      averageRating: product.averageRating ? Number(product.averageRating) : null,
    }));

    return {
      success: true,
      data: {
        products: productsWithNumbers,
        totalCount,
        totalPages,
        currentPage: page,
      },
    };
  } catch (error) {
    console.error('Error fetching new arrivals:', error);
    return { success: false, error: 'Failed to fetch new arrivals' };
  }
}
