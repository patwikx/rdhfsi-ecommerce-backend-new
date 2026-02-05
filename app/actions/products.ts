'use server'

import { prisma } from '@/lib/prisma';

// Helper function to map product data
function mapProductToDetails(product: {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  slug: string;
  baseUom: string;
  retailPrice: { toNumber: () => number } | number;
  compareAtPrice: { toNumber: () => number } | number | null;
  bulkPrice: { toNumber: () => number } | number | null;
  moq: number;
  leadTime: string | null;
  averageRating: { toNumber: () => number } | number | null;
  reviewCount: number;
  images: Array<{
    id: string;
    url: string;
    altText: string | null;
    isPrimary: boolean;
  }>;
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
  inventories: Array<{
    id: string;
    availableQty: { toNumber: () => number } | number;
    site: {
      name: string;
    };
  }>;
}): ProductWithDetails {
  return {
    id: product.id,
    sku: product.sku,
    barcode: product.barcode,
    name: product.name,
    slug: product.slug,
    baseUom: product.baseUom,
    retailPrice: typeof product.retailPrice === 'number' ? product.retailPrice : Number(product.retailPrice),
    compareAtPrice: product.compareAtPrice ? (typeof product.compareAtPrice === 'number' ? product.compareAtPrice : Number(product.compareAtPrice)) : null,
    bulkPrice: product.bulkPrice ? (typeof product.bulkPrice === 'number' ? product.bulkPrice : Number(product.bulkPrice)) : null,
    moq: product.moq,
    leadTime: product.leadTime,
    averageRating: product.averageRating ? (typeof product.averageRating === 'number' ? product.averageRating : Number(product.averageRating)) : null,
    reviewCount: product.reviewCount,
    images: product.images,
    category: product.category,
    brand: product.brand,
    inventories: product.inventories.map(inv => ({
      id: inv.id,
      availableQty: typeof inv.availableQty === 'number' ? inv.availableQty : Number(inv.availableQty),
      site: inv.site,
    })),
  };
}

export interface ProductWithDetails {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  slug: string;
  baseUom?: string;
  retailPrice: number;
  compareAtPrice?: number | null;
  bulkPrice: number | null;
  moq: number;
  leadTime: string | null;
  averageRating: number | null;
  reviewCount: number;
  ratingBreakdown?: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  images: Array<{
    id: string;
    url: string;
    altText: string | null;
    isPrimary: boolean;
  }>;
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
  inventories: Array<{
    id: string;
    availableQty: number;
    site: {
      name: string;
    };
  }>;
}

export interface CategoryWithStats {
  id: string;
  name: string;
  slug: string;
  itemCount: number;
  trendPercent: number | null;
}

export interface BrandInfo {
  id: string;
  name: string;
  slug: string;
  isFeatured: boolean;
}

export async function getProducts(params?: {
  limit?: number;
  offset?: number;
  featured?: boolean;
  trending?: boolean;
}): Promise<ProductWithDetails[]> {
  const { limit = 8, offset = 0, featured = false, trending = false } = params || {};

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      isPublished: true,
      ...(featured && { isFeatured: true }),
      ...(trending && { isTrending: true }),
    },
    skip: offset,
    take: limit,
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      images: {
        orderBy: {
          sortOrder: 'asc',
        },
        select: {
          id: true,
          url: true,
          altText: true,
          isPrimary: true,
        },
      },
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
      inventories: {
        where: {
          availableQty: {
            gt: 0,
          },
        },
        select: {
          id: true,
          availableQty: true,
          site: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  return products.map(product => ({
    id: product.id,
    sku: product.sku,
    barcode: product.barcode,
    name: product.name,
    slug: product.slug,
    baseUom: product.baseUom,
    retailPrice: Number(product.retailPrice),
    bulkPrice: product.bulkPrice ? Number(product.bulkPrice) : null,
    moq: product.moq,
    leadTime: product.leadTime,
    averageRating: product.averageRating ? Number(product.averageRating) : null,
    reviewCount: product.reviewCount,
    images: product.images,
    category: product.category,
    brand: product.brand,
    inventories: product.inventories.map(inv => ({
      id: inv.id,
      availableQty: Number(inv.availableQty),
      site: inv.site,
    })),
  }));
}

export async function getCategories(params?: {
  limit?: number;
  featured?: boolean;
}): Promise<CategoryWithStats[]> {
  const { limit = 8, featured = false } = params || {};

  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
      ...(featured && { isFeatured: true }),
    },
    take: limit,
    orderBy: {
      sortOrder: 'asc',
    },
    select: {
      id: true,
      name: true,
      slug: true,
      itemCount: true,
      trendPercent: true,
    },
  });

  return categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    itemCount: cat.itemCount,
    trendPercent: cat.trendPercent ? Number(cat.trendPercent) : null,
  }));
}

export async function getFeaturedBrands(limit = 6): Promise<BrandInfo[]> {
  const brands = await prisma.brand.findMany({
    where: {
      isActive: true,
      isFeatured: true,
    },
    take: limit,
    orderBy: {
      sortOrder: 'asc',
    },
    select: {
      id: true,
      name: true,
      slug: true,
      isFeatured: true,
    },
  });

  return brands;
}

export async function getProductCount(): Promise<number> {
  return await prisma.product.count({
    where: {
      isActive: true,
      isPublished: true,
    },
  });
}

export async function getProductsByCategory(
  categorySlug: string,
  params?: {
    limit?: number;
    offset?: number;
  }
): Promise<ProductWithDetails[]> {
  const { limit = 20, offset = 0 } = params || {};

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      isPublished: true,
      category: {
        slug: categorySlug,
      },
    },
    skip: offset,
    take: limit,
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      images: {
        orderBy: {
          sortOrder: 'asc',
        },
        select: {
          id: true,
          url: true,
          altText: true,
          isPrimary: true,
        },
      },
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
      inventories: {
        where: {
          availableQty: {
            gt: 0,
          },
        },
        select: {
          id: true,
          availableQty: true,
          site: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  return products.map(product => ({
    id: product.id,
    sku: product.sku,
    barcode: product.barcode,
    name: product.name,
    slug: product.slug,
    baseUom: product.baseUom,
    retailPrice: Number(product.retailPrice),
    bulkPrice: product.bulkPrice ? Number(product.bulkPrice) : null,
    moq: product.moq,
    leadTime: product.leadTime,
    averageRating: product.averageRating ? Number(product.averageRating) : null,
    reviewCount: product.reviewCount,
    images: product.images,
    category: product.category,
    brand: product.brand,
    inventories: product.inventories.map(inv => ({
      id: inv.id,
      availableQty: Number(inv.availableQty),
      site: inv.site,
    })),
  }));
}

export async function getCategoryBySlug(slug: string) {
  const category = await prisma.category.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      itemCount: true,
      trendPercent: true,
    },
  });

  if (!category) return null;

  const productCount = await prisma.product.count({
    where: {
      categoryId: category.id,
      isActive: true,
      isPublished: true,
    },
  });

  return {
    ...category,
    itemCount: productCount,
    trendPercent: category.trendPercent ? Number(category.trendPercent) : null,
  };
}

export async function getProductBySlug(slug: string): Promise<ProductWithDetails | null> {
  const product = await prisma.product.findUnique({
    where: {
      slug,
      isActive: true,
      isPublished: true,
    },
    include: {
      images: {
        orderBy: {
          sortOrder: 'asc',
        },
        select: {
          id: true,
          url: true,
          altText: true,
          isPrimary: true,
        },
      },
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
      inventories: {
        where: {
          availableQty: {
            gt: 0,
          },
        },
        select: {
          id: true,
          availableQty: true,
          site: {
            select: {
              name: true,
            },
          },
        },
      },
      reviews: {
        where: {
          isApproved: true,
        },
        select: {
          rating: true,
        },
      },
    },
  });

  if (!product) return null;

  // Calculate rating breakdown
  const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  product.reviews.forEach(review => {
    if (review.rating >= 1 && review.rating <= 5) {
      ratingBreakdown[review.rating as keyof typeof ratingBreakdown]++;
    }
  });

  return {
    id: product.id,
    sku: product.sku,
    barcode: product.barcode,
    name: product.name,
    slug: product.slug,
    baseUom: product.baseUom,
    retailPrice: Number(product.retailPrice),
    bulkPrice: product.bulkPrice ? Number(product.bulkPrice) : null,
    moq: product.moq,
    leadTime: product.leadTime,
    averageRating: product.averageRating ? Number(product.averageRating) : null,
    reviewCount: product.reviewCount,
    ratingBreakdown,
    images: product.images,
    category: product.category,
    brand: product.brand,
    inventories: product.inventories.map(inv => ({
      id: inv.id,
      availableQty: Number(inv.availableQty),
      site: inv.site,
    })),
  };
}

export async function searchProducts(query: string): Promise<ProductWithDetails[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const searchTerm = query.trim();

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      isPublished: true,
      OR: [
        {
          name: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
        {
          sku: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
        {
          barcode: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
        {
          category: {
            name: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
        },
      ],
    },
    take: 50,
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      images: {
        orderBy: {
          sortOrder: 'asc',
        },
        select: {
          id: true,
          url: true,
          altText: true,
          isPrimary: true,
        },
      },
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
      inventories: {
        where: {
          availableQty: {
            gt: 0,
          },
        },
        select: {
          id: true,
          availableQty: true,
          site: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  return products.map(product => ({
    id: product.id,
    sku: product.sku,
    barcode: product.barcode,
    name: product.name,
    slug: product.slug,
    baseUom: product.baseUom,
    retailPrice: Number(product.retailPrice),
    bulkPrice: product.bulkPrice ? Number(product.bulkPrice) : null,
    moq: product.moq,
    leadTime: product.leadTime,
    averageRating: product.averageRating ? Number(product.averageRating) : null,
    reviewCount: product.reviewCount,
    images: product.images,
    category: product.category,
    brand: product.brand,
    inventories: product.inventories.map(inv => ({
      id: inv.id,
      availableQty: Number(inv.availableQty),
      site: inv.site,
    })),
  }));
}
