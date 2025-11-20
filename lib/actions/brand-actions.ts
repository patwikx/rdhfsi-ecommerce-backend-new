'use server';

import { prisma } from '@/lib/prisma';
import { BrandWithCount, BrandProductsResult } from '@/types/brand';
import { Prisma } from '@prisma/client';
import { logBrandView } from './activity-log-actions';

/**
 * Get all active brands with product counts
 */
export async function getAllBrands(options?: {
  featured?: boolean;
  sortBy?: 'name' | 'products' | 'featured';
}): Promise<{ success: boolean; brands?: BrandWithCount[]; error?: string }> {
  try {
    const where: Prisma.BrandWhereInput = {
      isActive: true,
    };

    if (options?.featured) {
      where.isFeatured = true;
    }

    let orderBy: Prisma.BrandOrderByWithRelationInput | Prisma.BrandOrderByWithRelationInput[] = { name: 'asc' };

    if (options?.sortBy === 'products') {
      orderBy = { products: { _count: 'desc' } };
    } else if (options?.sortBy === 'featured') {
      orderBy = [{ isFeatured: 'desc' }, { name: 'asc' }];
    }

    const brands = await prisma.brand.findMany({
      where,
      orderBy,
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        description: true,
        website: true,
        isFeatured: true,
        isActive: true,
        _count: {
          select: {
            products: {
              where: {
                isActive: true,
                isPublished: true,
              },
            },
          },
        },
      },
    });

    return { success: true, brands };
  } catch (error) {
    console.error('Error fetching brands:', error);
    return { success: false, error: 'Failed to fetch brands' };
  }
}

/**
 * Get featured brands only
 */
export async function getFeaturedBrands(): Promise<{
  success: boolean;
  brands?: BrandWithCount[];
  error?: string;
}> {
  return getAllBrands({ featured: true, sortBy: 'featured' });
}

/**
 * Get brand by slug with details
 */
export async function getBrandBySlug(slug: string): Promise<{
  success: boolean;
  brand?: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    description: string | null;
    website: string | null;
    isFeatured: boolean;
    _count: {
      products: number;
    };
  };
  error?: string;
}> {
  try {
    const brand = await prisma.brand.findUnique({
      where: { slug, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        description: true,
        website: true,
        isFeatured: true,
        _count: {
          select: {
            products: {
              where: {
                isActive: true,
                isPublished: true,
              },
            },
          },
        },
      },
    });

    if (!brand) {
      return { success: false, error: 'Brand not found' };
    }

    return { success: true, brand };
  } catch (error) {
    console.error('Error fetching brand:', error);
    return { success: false, error: 'Failed to fetch brand' };
  }
}

/**
 * Get products by brand with pagination and filters
 */
export async function getBrandProducts(
  slug: string,
  options?: {
    categoryId?: string;
    sortBy?: 'newest' | 'price-asc' | 'price-desc' | 'popular' | 'name';
    page?: number;
    limit?: number;
  }
): Promise<{ success: boolean; data?: BrandProductsResult; error?: string }> {
  try {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    // First, get the brand
    const brand = await prisma.brand.findUnique({
      where: { slug, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        description: true,
        website: true,
        isFeatured: true,
      },
    });

    if (!brand) {
      return { success: false, error: 'Brand not found' };
    }

    // Build where clause
    const where: Prisma.ProductWhereInput = {
      brandId: brand.id,
      isActive: true,
      isPublished: true,
    };

    if (options?.categoryId) {
      where.categoryId = options.categoryId;
    }

    // Build order by clause
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
      case 'name':
        orderBy = { name: 'asc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    // Get products and total count
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

    // Convert Decimal to number
    const productsWithNumbers = products.map((product) => ({
      ...product,
      retailPrice: Number(product.retailPrice),
      compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
      averageRating: product.averageRating ? Number(product.averageRating) : null,
    }));

    // Log brand view activity (async, don't wait for it)
    logBrandView({
      brandId: brand.id,
      brandName: brand.name,
      brandSlug: brand.slug,
    }).catch((error) => console.error('Failed to log brand view:', error));

    return {
      success: true,
      data: {
        brand,
        products: productsWithNumbers,
        totalCount,
        totalPages,
        currentPage: page,
      },
    };
  } catch (error) {
    console.error('Error fetching brand products:', error);
    return { success: false, error: 'Failed to fetch brand products' };
  }
}

/**
 * Search brands by name
 */
export async function searchBrands(query: string): Promise<{
  success: boolean;
  brands?: BrandWithCount[];
  error?: string;
}> {
  try {
    if (!query || query.trim().length === 0) {
      return getAllBrands();
    }

    const brands = await prisma.brand.findMany({
      where: {
        isActive: true,
        name: {
          contains: query,
          mode: 'insensitive',
        },
      },
      orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        description: true,
        website: true,
        isFeatured: true,
        isActive: true,
        _count: {
          select: {
            products: {
              where: {
                isActive: true,
                isPublished: true,
              },
            },
          },
        },
      },
    });

    return { success: true, brands };
  } catch (error) {
    console.error('Error searching brands:', error);
    return { success: false, error: 'Failed to search brands' };
  }
}

/**
 * Get categories for a specific brand (for filtering)
 */
export async function getBrandCategories(brandId: string): Promise<{
  success: boolean;
  categories?: { id: string; name: string; slug: string; productCount: number }[];
  error?: string;
}> {
  try {
    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
        products: {
          some: {
            brandId,
            isActive: true,
            isPublished: true,
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            products: {
              where: {
                brandId,
                isActive: true,
                isPublished: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    const categoriesWithCount = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      productCount: cat._count.products,
    }));

    return { success: true, categories: categoriesWithCount };
  } catch (error) {
    console.error('Error fetching brand categories:', error);
    return { success: false, error: 'Failed to fetch categories' };
  }
}
