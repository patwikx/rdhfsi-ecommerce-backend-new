export type BrandWithCount = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  description: string | null;
  website: string | null;
  isFeatured: boolean;
  isActive: boolean;
  _count: {
    products: number;
  };
};

export type BrandProductsResult = {
  brand: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    description: string | null;
    website: string | null;
    isFeatured: boolean;
  };
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
};
