'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { categoryFormSchema, type CategoryFormValues } from '@/lib/validations/category-validation';

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

type CategoryWithChildren = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  itemCount: number;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  children: CategoryWithChildren[];
};

/**
 * Get all categories (flat list)
 */
export async function getAllCategories(siteId?: string): Promise<ActionResult<{
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  itemCount: number;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  parent: { name: string } | null;
  _count: { children: number; products: number };
  siteProductCount?: number;
}[]>> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const categories = await prisma.category.findMany({
      include: {
        parent: {
          select: { name: true },
        },
        _count: {
          select: {
            children: true,
            products: siteId ? {
              where: {
                inventories: {
                  some: {
                    siteId,
                    availableQty: { gt: 0 }
                  }
                }
              }
            } : true,
          },
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    // If siteId is provided, add site-specific product count
    const categoriesWithSiteCount = categories.map(category => ({
      ...category,
      siteProductCount: siteId ? category._count.products : undefined,
    }));

    return { success: true, data: categoriesWithSiteCount };
  } catch (error) {
    console.error('Error fetching categories:', error);
    return { success: false, error: 'Failed to fetch categories' };
  }
}

/**
 * Get category tree (hierarchical)
 */
export async function getCategoryTree(): Promise<ActionResult<CategoryWithChildren[]>> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const categories = await prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            children: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return { success: true, data: categories as CategoryWithChildren[] };
  } catch (error) {
    console.error('Error fetching category tree:', error);
    return { success: false, error: 'Failed to fetch category tree' };
  }
}

/**
 * Get category by ID
 */
export async function getCategoryById(id: string): Promise<ActionResult<{
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  itemCount: number;
  trendPercent: number | null;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
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
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      return { success: false, error: 'Category not found' };
    }

    return { 
      success: true, 
      data: {
        ...category,
        trendPercent: category.trendPercent ? Number(category.trendPercent) : null,
      }
    };
  } catch (error) {
    console.error('Error fetching category:', error);
    return { success: false, error: 'Failed to fetch category' };
  }
}

/**
 * Create a new category
 */
export async function createCategory(data: CategoryFormValues): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const validatedData = categoryFormSchema.parse(data);

    // Check if name already exists
    const existingName = await prisma.category.findUnique({
      where: { name: validatedData.name },
    });

    if (existingName) {
      return { success: false, error: 'Category name already exists' };
    }

    // Check if slug already exists
    const existingSlug = await prisma.category.findUnique({
      where: { slug: validatedData.slug },
    });

    if (existingSlug) {
      return { success: false, error: 'Category slug already exists' };
    }

    // Create category
    const category = await prisma.category.create({
      data: {
        ...validatedData,
        parentId: validatedData.parentId || null,
      },
    });

    revalidatePath('/admin/categories');
    
    return { success: true, data: { id: category.id } };
  } catch (error) {
    console.error('Error creating category:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to create category' };
  }
}

/**
 * Update a category
 */
export async function updateCategory(id: string, data: CategoryFormValues): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const validatedData = categoryFormSchema.parse(data);

    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return { success: false, error: 'Category not found' };
    }

    // Check if name is being changed and if it already exists
    if (validatedData.name !== existingCategory.name) {
      const existingName = await prisma.category.findUnique({
        where: { name: validatedData.name },
      });

      if (existingName) {
        return { success: false, error: 'Category name already exists' };
      }
    }

    // Check if slug is being changed and if it already exists
    if (validatedData.slug !== existingCategory.slug) {
      const existingSlug = await prisma.category.findUnique({
        where: { slug: validatedData.slug },
      });

      if (existingSlug) {
        return { success: false, error: 'Category slug already exists' };
      }
    }

    // Prevent setting self as parent
    if (validatedData.parentId === id) {
      return { success: false, error: 'Category cannot be its own parent' };
    }

    // Update category
    const category = await prisma.category.update({
      where: { id },
      data: {
        ...validatedData,
        parentId: validatedData.parentId || null,
      },
    });

    revalidatePath('/admin/categories');
    revalidatePath(`/admin/categories/${id}`);
    
    return { success: true, data: { id: category.id } };
  } catch (error) {
    console.error('Error updating category:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to update category' };
  }
}

/**
 * Delete a category
 */
export async function deleteCategory(id: string): Promise<ActionResult> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Only admins can delete categories' };
  }

  try {
    // Check if category has products
    const productCount = await prisma.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      return { success: false, error: 'Cannot delete category with existing products' };
    }

    // Check if category has children
    const childrenCount = await prisma.category.count({
      where: { parentId: id },
    });

    if (childrenCount > 0) {
      return { success: false, error: 'Cannot delete category with subcategories' };
    }

    await prisma.category.delete({
      where: { id },
    });

    revalidatePath('/admin/categories');
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting category:', error);
    return { success: false, error: 'Failed to delete category' };
  }
}

/**
 * Toggle category active status
 */
export async function toggleCategoryStatus(id: string): Promise<ActionResult> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      return { success: false, error: 'Category not found' };
    }

    await prisma.category.update({
      where: { id },
      data: { isActive: !category.isActive },
    });

    revalidatePath('/admin/categories');
    
    return { success: true };
  } catch (error) {
    console.error('Error toggling category status:', error);
    return { success: false, error: 'Failed to toggle category status' };
  }
}

/**
 * Get parent categories (for dropdown)
 */
export async function getParentCategories(): Promise<ActionResult<{
  id: string;
  name: string;
}[]>> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return { success: true, data: categories };
  } catch (error) {
    console.error('Error fetching parent categories:', error);
    return { success: false, error: 'Failed to fetch categories' };
  }
}
