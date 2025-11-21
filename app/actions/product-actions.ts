'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { productFormSchema, type ProductFormValues } from '@/lib/validations/product-validation';

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Get all products with filters
 */
export async function getAllProducts(filters?: {
  categoryId?: string;
  brandId?: string;
  isActive?: boolean;
  search?: string;
}): Promise<ActionResult<{
  id: string;
  sku: string;
  name: string;
  slug: string;
  retailPrice: number;
  isActive: boolean;
  isFeatured: boolean;
  category: { name: string };
  brand: { name: string } | null;
  images: { url: string; sortOrder: number }[];
  _count: { inventories: number };
}[]>> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const where: {
      categoryId?: string;
      brandId?: string;
      isActive?: boolean;
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' };
        sku?: { contains: string; mode: 'insensitive' };
        barcode?: { contains: string; mode: 'insensitive' };
      }>;
    } = {};
    
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.brandId) where.brandId = filters.brandId;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
        { barcode: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const productsData = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: { name: true },
        },
        brand: {
          select: { name: true },
        },
        images: {
          select: { url: true, sortOrder: true },
          orderBy: { sortOrder: 'desc' },
          take: 1,
        },
        _count: {
          select: { inventories: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Convert Decimal fields to numbers for client components
    const products = productsData.map(product => ({
      ...product,
      retailPrice: Number(product.retailPrice),
      wholesalePrice: product.wholesalePrice ? Number(product.wholesalePrice) : null,
      poPrice: product.poPrice ? Number(product.poPrice) : null,
      costPrice: product.costPrice ? Number(product.costPrice) : null,
      compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
      bulkPrice: product.bulkPrice ? Number(product.bulkPrice) : null,
      weight: product.weight ? Number(product.weight) : null,
      averageRating: product.averageRating ? Number(product.averageRating) : null,
    }));

    return { success: true, data: products };
  } catch (error) {
    console.error('Error fetching products:', error);
    return { success: false, error: 'Failed to fetch products' };
  }
}

/**
 * Get product by ID
 */
export async function getProductById(id: string): Promise<ActionResult<{
  id: string;
  sku: string;
  barcode: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  categoryId: string;
  brandId: string | null;
  model: string | null;
  baseUom: string;
  retailPrice: number;
  wholesalePrice: number | null;
  poPrice: number | null;
  costPrice: number | null;
  compareAtPrice: number | null;
  moq: number;
  bulkPrice: number | null;
  bulkThreshold: number | null;
  weight: number | null;
  dimensions: string | null;
  leadTime: string | null;
  isActive: boolean;
  isFeatured: boolean;
  isPublished: boolean;
  isTrending: boolean;
  isOnSale: boolean;
  isClearance: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  specifications: unknown;
  averageRating: number | null;
  reviewCount: number;
  legacyProductCode: string | null;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  images: { id: string; url: string; altText: string | null; sortOrder: number; isPrimary: boolean; productId: string; createdAt: Date }[];
}>> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const productData = await prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { sortOrder: 'desc' },
        },
      },
    });

    if (!productData) {
      return { success: false, error: 'Product not found' };
    }

    // Convert Decimal fields to numbers for client components
    const product = {
      ...productData,
      retailPrice: Number(productData.retailPrice),
      wholesalePrice: productData.wholesalePrice ? Number(productData.wholesalePrice) : null,
      poPrice: productData.poPrice ? Number(productData.poPrice) : null,
      costPrice: productData.costPrice ? Number(productData.costPrice) : null,
      compareAtPrice: productData.compareAtPrice ? Number(productData.compareAtPrice) : null,
      bulkPrice: productData.bulkPrice ? Number(productData.bulkPrice) : null,
      weight: productData.weight ? Number(productData.weight) : null,
      averageRating: productData.averageRating ? Number(productData.averageRating) : null,
    };

    return { success: true, data: product };
  } catch (error) {
    console.error('Error fetching product:', error);
    return { success: false, error: 'Failed to fetch product' };
  }
}

/**
 * Create a new product
 */
export async function createProduct(data: ProductFormValues, images: { url: string; sortOrder: number }[]): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const validatedData = productFormSchema.parse(data);

    // Convert empty strings to null/undefined
    const cleanedData = {
      ...validatedData,
      brandId: validatedData.brandId === '' ? null : validatedData.brandId,
      description: validatedData.description === '' ? undefined : validatedData.description,
      shortDescription: validatedData.shortDescription === '' ? undefined : validatedData.shortDescription,
      model: validatedData.model === '' ? undefined : validatedData.model,
      dimensions: validatedData.dimensions === '' ? undefined : validatedData.dimensions,
      leadTime: validatedData.leadTime === '' ? undefined : validatedData.leadTime,
      metaTitle: validatedData.metaTitle === '' ? undefined : validatedData.metaTitle,
      metaDescription: validatedData.metaDescription === '' ? undefined : validatedData.metaDescription,
      metaKeywords: validatedData.metaKeywords === '' ? undefined : validatedData.metaKeywords,
      specifications: validatedData.specifications === '' ? undefined : validatedData.specifications,
    };

    // Check if SKU already exists
    const existingSku = await prisma.product.findUnique({
      where: { sku: validatedData.sku },
    });

    if (existingSku) {
      return { success: false, error: 'SKU already exists' };
    }

    // Check if barcode already exists
    const existingBarcode = await prisma.product.findUnique({
      where: { barcode: validatedData.barcode },
    });

    if (existingBarcode) {
      return { success: false, error: 'Barcode already exists' };
    }

    // Parse specifications from plain text to JSON
    let specifications = null;
    if (cleanedData.specifications) {
      const lines = cleanedData.specifications.split('\n').filter(line => line.trim());
      const specs: Record<string, string> = {};
      lines.forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          specs[key.trim()] = valueParts.join(':').trim();
        }
      });
      specifications = Object.keys(specs).length > 0 ? specs : null;
    }

    const product = await prisma.product.create({
      data: {
        ...cleanedData,
        specifications: specifications || undefined,
        images: {
          create: images.map((img, index) => ({
            url: img.url,
            sortOrder: img.sortOrder || index,
          })),
        },
      },
      include: {
        category: {
          select: { name: true },
        },
      },
    });

    // Create notifications for all customers about new product
    if (product.isPublished && product.isActive) {
      try {
        // Get all customer users
        const customers = await prisma.user.findMany({
          where: {
            role: {
              in: ['CUSTOMER', 'CORPORATE'],
            },
          },
          select: {
            id: true,
          },
        });

        // Create notifications for all customers
        const notifications = customers.map(customer => ({
          userId: customer.id,
          type: 'SYSTEM' as const,
          title: 'New Product Available',
          message: `Check out our new product: ${product.name} in ${product.category.name}`,
          link: `/products/${product.slug}`,
          referenceType: 'PRODUCT',
          referenceId: product.id,
          isRead: false,
        }));

        // Batch create notifications
        if (notifications.length > 0) {
          await prisma.notification.createMany({
            data: notifications,
          });
        }
      } catch (error) {
        console.error('Error creating product notifications:', error);
        // Don't fail the product creation if notifications fail
      }
    }

    revalidatePath('/admin/products');
    
    return { success: true, data: { id: product.id } };
  } catch (error) {
    console.error('Error creating product:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to create product' };
  }
}

/**
 * Update a product
 */
export async function updateProduct(id: string, data: ProductFormValues, images: { url: string; sortOrder: number }[]): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const validatedData = productFormSchema.parse(data);

    // Convert empty strings to null/undefined
    const cleanedData = {
      ...validatedData,
      brandId: validatedData.brandId === '' ? null : validatedData.brandId,
      description: validatedData.description === '' ? undefined : validatedData.description,
      shortDescription: validatedData.shortDescription === '' ? undefined : validatedData.shortDescription,
      model: validatedData.model === '' ? undefined : validatedData.model,
      dimensions: validatedData.dimensions === '' ? undefined : validatedData.dimensions,
      leadTime: validatedData.leadTime === '' ? undefined : validatedData.leadTime,
      metaTitle: validatedData.metaTitle === '' ? undefined : validatedData.metaTitle,
      metaDescription: validatedData.metaDescription === '' ? undefined : validatedData.metaDescription,
      metaKeywords: validatedData.metaKeywords === '' ? undefined : validatedData.metaKeywords,
      specifications: validatedData.specifications === '' ? undefined : validatedData.specifications,
    };

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return { success: false, error: 'Product not found' };
    }

    // Check if SKU is being changed and if it already exists
    if (validatedData.sku !== existingProduct.sku) {
      const existingSku = await prisma.product.findUnique({
        where: { sku: validatedData.sku },
      });

      if (existingSku) {
        return { success: false, error: 'SKU already exists' };
      }
    }

    // Check if barcode is being changed and if it already exists
    if (validatedData.barcode !== existingProduct.barcode) {
      const existingBarcode = await prisma.product.findUnique({
        where: { barcode: validatedData.barcode },
      });

      if (existingBarcode) {
        return { success: false, error: 'Barcode already exists' };
      }
    }

    // Parse specifications from plain text to JSON
    let specifications = null;
    if (cleanedData.specifications) {
      const lines = cleanedData.specifications.split('\n').filter(line => line.trim());
      const specs: Record<string, string> = {};
      lines.forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          specs[key.trim()] = valueParts.join(':').trim();
        }
      });
      specifications = Object.keys(specs).length > 0 ? specs : null;
    }

    // Delete existing images and create new ones
    await prisma.productImage.deleteMany({
      where: { productId: id },
    });

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...cleanedData,
        specifications: specifications || undefined,
        images: {
          create: images.map((img, index) => ({
            url: img.url,
            sortOrder: img.sortOrder || index,
          })),
        },
      },
    });

    revalidatePath('/admin/products');
    revalidatePath(`/admin/products/${id}`);
    
    return { success: true, data: { id: product.id } };
  } catch (error) {
    console.error('Error updating product:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to update product' };
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(id: string): Promise<ActionResult> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Only admins can delete products' };
  }

  try {
    // Check if product has inventory
    const inventoryCount = await prisma.inventory.count({
      where: { productId: id },
    });

    if (inventoryCount > 0) {
      return { success: false, error: 'Cannot delete product with existing inventory' };
    }

    // Check if product has orders
    const orderCount = await prisma.orderItem.count({
      where: { productId: id },
    });

    if (orderCount > 0) {
      return { success: false, error: 'Cannot delete product with existing orders' };
    }

    await prisma.product.delete({
      where: { id },
    });

    revalidatePath('/admin/products');
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting product:', error);
    return { success: false, error: 'Failed to delete product' };
  }
}

/**
 * Toggle product active status
 */
export async function toggleProductStatus(id: string): Promise<ActionResult> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return { success: false, error: 'Product not found' };
    }

    await prisma.product.update({
      where: { id },
      data: { isActive: !product.isActive },
    });

    revalidatePath('/admin/products');
    
    return { success: true };
  } catch (error) {
    console.error('Error toggling product status:', error);
    return { success: false, error: 'Failed to toggle product status' };
  }
}

/**
 * Get product details by SKU or barcode for QR scanner
 */
export async function getProductByQRCode(qrData: string): Promise<ActionResult<{
  id: string;
  sku: string;
  barcode: string;
  name: string;
  description: string | null;
  retailPrice: number;
  wholesalePrice: number | null;
  poPrice: number | null;
  costPrice: number | null;
  compareAtPrice: number | null;
  isActive: boolean;
  category: { name: string };
  brand: { name: string } | null;
  images: { url: string; sortOrder: number }[];
  inventories: {
    id: string;
    quantity: number;
    site: { id: string; name: string; code: string };
    shelf: { id: string; code: string; aisle: { code: string } } | null;
  }[];
  totalQuantity: number;
}>> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    // Try to parse QR data as JSON first
    let productId: string | null = null;
    let sku: string | null = null;
    let barcode: string | null = null;

    try {
      const parsed = JSON.parse(qrData);
      if (parsed.type === 'PRODUCT') {
        productId = parsed.productId;
        sku = parsed.sku;
        barcode = parsed.barcode;
      }
    } catch {
      // If not JSON, treat as SKU or barcode
      sku = qrData;
      barcode = qrData;
    }

    // Find product by ID, SKU, or barcode
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          productId ? { id: productId } : {},
          sku ? { sku } : {},
          barcode ? { barcode } : {},
        ].filter(condition => Object.keys(condition).length > 0),
      },
      include: {
        category: {
          select: { name: true },
        },
        brand: {
          select: { name: true },
        },
        images: {
          select: { url: true, sortOrder: true },
          orderBy: { sortOrder: 'desc' },
        },
      },
    });

    if (!product) {
      return { success: false, error: 'Product not found' };
    }

    // Get inventories with site information
    const inventoriesData = await prisma.inventory.findMany({
      where: {
        productId: product.id,
        quantity: { gt: 0 },
      },
      include: {
        site: true,
      },
      orderBy: [
        { site: { name: 'desc' } },
        { quantity: 'desc' },
      ],
    });

    // Get bin locations for this product
    const binInventories = await prisma.binInventory.findMany({
      where: {
        productId: product.id,
        quantity: { gt: 0 },
      },
      include: {
        shelf: {
          include: {
            aisle: true,
          },
        },
        site: true,
      },
    });

    // Transform inventories to match expected type
    const inventories = inventoriesData.map(inv => {
      // Find primary bin location for this site
      const primaryBin = binInventories.find(
        bin => bin.siteId === inv.siteId && bin.isPrimary
      );
      // Or just get the first bin for this site
      const anyBin = binInventories.find(bin => bin.siteId === inv.siteId);
      const binLocation = primaryBin || anyBin;

      return {
        id: inv.id,
        quantity: Number(inv.quantity),
        site: {
          id: inv.site.id,
          name: inv.site.name,
          code: inv.site.code,
        },
        shelf: binLocation && binLocation.shelf.aisle ? {
          id: binLocation.shelf.id,
          code: binLocation.shelf.code,
          aisle: {
            code: binLocation.shelf.aisle.code,
          },
        } : null,
      };
    });

    // Calculate total quantity across all sites
    const totalQuantity = inventories.reduce((sum: number, inv) => sum + inv.quantity, 0);

    // Convert Decimal fields to numbers
    const productData = {
      id: product.id,
      sku: product.sku,
      barcode: product.barcode,
      name: product.name,
      description: product.description,
      retailPrice: Number(product.retailPrice),
      wholesalePrice: product.wholesalePrice ? Number(product.wholesalePrice) : null,
      poPrice: product.poPrice ? Number(product.poPrice) : null,
      costPrice: product.costPrice ? Number(product.costPrice) : null,
      compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
      isActive: product.isActive,
      category: product.category,
      brand: product.brand,
      images: product.images,
      inventories,
      totalQuantity,
    };

    return { success: true, data: productData };
  } catch (error) {
    console.error('Error fetching product by QR code:', error);
    return { success: false, error: 'Failed to fetch product details' };
  }
}

/**
 * Get count of products without QR codes
 */
export async function getProductsWithoutQRCount(): Promise<ActionResult<{ count: number; productIds: string[] }>> {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Unauthorized: Please log in',
      };
    }

    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return {
        success: false,
        error: 'Unauthorized: Insufficient permissions',
      };
    }

    const productsWithoutQR = await prisma.product.findMany({
      where: {
        OR: [
          { qrCode: null },
          { qrCodeImage: null },
        ],
      },
      select: {
        id: true,
      },
    });

    return {
      success: true,
      data: {
        count: productsWithoutQR.length,
        productIds: productsWithoutQR.map(p => p.id),
      },
    };
  } catch (error) {
    console.error('Get products without QR count error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get count',
    };
  }
}

/**
 * Generate QR code for a single product
 */
export async function generateSingleProductQRCode(productId: string): Promise<ActionResult<{ success: boolean }>> {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Unauthorized: Please log in',
      };
    }

    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return {
        success: false,
        error: 'Unauthorized: Insufficient permissions',
      };
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        sku: true,
        name: true,
        barcode: true,
      },
    });

    if (!product) {
      return {
        success: false,
        error: 'Product not found',
      };
    }

    // Import QRCode dynamically
    const QRCode = (await import('qrcode')).default;

    // Create QR data with product information
    const qrData = JSON.stringify({
      type: 'PRODUCT',
      productId: product.id,
      sku: product.sku,
      name: product.name,
      barcode: product.barcode,
      timestamp: new Date().toISOString(),
    });

    // Generate QR code as data URL
    const qrCodeImage = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2,
    });

    // Generate unique QR code string
    const qrCode = `PRODUCT-${product.sku}-${Date.now()}`;

    // Update product with QR code
    await prisma.product.update({
      where: { id: product.id },
      data: {
        qrCode,
        qrCodeImage,
      },
    });

    return {
      success: true,
      data: { success: true },
    };
  } catch (error) {
    console.error('Generate single QR code error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate QR code',
    };
  }
}

/**
 * Generate QR codes for products without QR codes
 */
export async function generateProductQRCodes(): Promise<ActionResult<{ generated: number }>> {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Unauthorized: Please log in',
      };
    }

    // Check if user has permission
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return {
        success: false,
        error: 'Unauthorized: Insufficient permissions',
      };
    }

    // Import QRCode dynamically
    const QRCode = (await import('qrcode')).default;

    // Get products without QR codes
    const productsWithoutQR = await prisma.product.findMany({
      where: {
        OR: [
          { qrCode: null },
          { qrCodeImage: null },
        ],
      },
      select: {
        id: true,
        sku: true,
        name: true,
        barcode: true,
      },
    });

    if (productsWithoutQR.length === 0) {
      return {
        success: true,
        data: { generated: 0 },
      };
    }

    // Generate QR codes for each product
    let generatedCount = 0;
    
    for (const product of productsWithoutQR) {
      try {
        // Create QR data with product information
        const qrData = JSON.stringify({
          type: 'PRODUCT',
          productId: product.id,
          sku: product.sku,
          name: product.name,
          barcode: product.barcode,
          timestamp: new Date().toISOString(),
        });

        // Generate QR code as data URL
        const qrCodeImage = await QRCode.toDataURL(qrData, {
          errorCorrectionLevel: 'H',
          type: 'image/png',
          width: 300,
          margin: 2,
        });

        // Generate unique QR code string
        const qrCode = `PRODUCT-${product.sku}-${Date.now()}`;

        // Update product with QR code
        await prisma.product.update({
          where: { id: product.id },
          data: {
            qrCode,
            qrCodeImage,
          },
        });

        generatedCount++;
      } catch (error) {
        console.error(`Failed to generate QR for product ${product.sku}:`, error);
        // Continue with next product
      }
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'GENERATE_PRODUCT_QR_CODES',
        description: `Generated QR codes for ${generatedCount} products`,
        metadata: { count: generatedCount },
      },
    });

    revalidatePath('/admin/products');

    return {
      success: true,
      data: { generated: generatedCount },
    };


  } catch (error) {
    console.error('Generate QR codes error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate QR codes',
    };
  }
}
