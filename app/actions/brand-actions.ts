'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { brandFormSchema, type BrandFormValues } from '@/lib/validations/brand-validation';

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Get all brands
 */
export async function getAllBrands(): Promise<ActionResult<{
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  description: string | null;
  website: string | null;
  isFeatured: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { products: number };
}[]>> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const brands = await prisma.brand.findMany({
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    return { success: true, data: brands };
  } catch (error) {
    console.error('Error fetching brands:', error);
    return { success: false, error: 'Failed to fetch brands' };
  }
}

/**
 * Get brand by ID
 */
export async function getBrandById(id: string): Promise<ActionResult<{
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  description: string | null;
  website: string | null;
  isFeatured: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}>> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const brand = await prisma.brand.findUnique({
      where: { id },
    });

    if (!brand) {
      return { success: false, error: 'Brand not found' };
    }

    return { success: true, data: brand };
  } catch (error) {
    console.error('Error fetching brand:', error);
    return { success: false, error: 'Failed to fetch brand' };
  }
}

/**
 * Create a new brand
 */
export async function createBrand(data: BrandFormValues): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const validatedData = brandFormSchema.parse(data);

    // Check if name already exists
    const existingName = await prisma.brand.findUnique({
      where: { name: validatedData.name },
    });

    if (existingName) {
      return { success: false, error: 'Brand name already exists' };
    }

    // Check if slug already exists
    const existingSlug = await prisma.brand.findUnique({
      where: { slug: validatedData.slug },
    });

    if (existingSlug) {
      return { success: false, error: 'Brand slug already exists' };
    }

    const brand = await prisma.brand.create({
      data: validatedData,
    });

    revalidatePath('/admin/brands');
    
    return { success: true, data: { id: brand.id } };
  } catch (error) {
    console.error('Error creating brand:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to create brand' };
  }
}

/**
 * Update a brand
 */
export async function updateBrand(id: string, data: BrandFormValues): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const validatedData = brandFormSchema.parse(data);

    const existingBrand = await prisma.brand.findUnique({
      where: { id },
    });

    if (!existingBrand) {
      return { success: false, error: 'Brand not found' };
    }

    // Check if name is being changed and if it already exists
    if (validatedData.name !== existingBrand.name) {
      const existingName = await prisma.brand.findUnique({
        where: { name: validatedData.name },
      });

      if (existingName) {
        return { success: false, error: 'Brand name already exists' };
      }
    }

    // Check if slug is being changed and if it already exists
    if (validatedData.slug !== existingBrand.slug) {
      const existingSlug = await prisma.brand.findUnique({
        where: { slug: validatedData.slug },
      });

      if (existingSlug) {
        return { success: false, error: 'Brand slug already exists' };
      }
    }

    const brand = await prisma.brand.update({
      where: { id },
      data: validatedData,
    });

    revalidatePath('/admin/brands');
    revalidatePath(`/admin/brands/${id}`);
    
    return { success: true, data: { id: brand.id } };
  } catch (error) {
    console.error('Error updating brand:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to update brand' };
  }
}

/**
 * Delete a brand
 */
export async function deleteBrand(id: string): Promise<ActionResult> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Only admins can delete brands' };
  }

  try {
    // Check if brand has products
    const productCount = await prisma.product.count({
      where: { brandId: id },
    });

    if (productCount > 0) {
      return { success: false, error: 'Cannot delete brand with existing products' };
    }

    await prisma.brand.delete({
      where: { id },
    });

    revalidatePath('/admin/brands');
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting brand:', error);
    return { success: false, error: 'Failed to delete brand' };
  }
}

/**
 * Toggle brand active status
 */
export async function toggleBrandStatus(id: string): Promise<ActionResult> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const brand = await prisma.brand.findUnique({
      where: { id },
    });

    if (!brand) {
      return { success: false, error: 'Brand not found' };
    }

    await prisma.brand.update({
      where: { id },
      data: { isActive: !brand.isActive },
    });

    revalidatePath('/admin/brands');
    
    return { success: true };
  } catch (error) {
    console.error('Error toggling brand status:', error);
    return { success: false, error: 'Failed to toggle brand status' };
  }
}
