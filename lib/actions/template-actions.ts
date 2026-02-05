'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

/**
 * Get all reorder templates for the current user
 */
export async function getUserTemplates(): Promise<{
  success: boolean;
  templates?: {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    lastUsedAt: Date | null;
    createdAt: Date;
    items: {
      id: string;
      quantity: number;
      product: {
        id: string;
        name: string;
        sku: string;
        slug: string;
        retailPrice: number;
        images: {
          url: string;
        }[];
      };
    }[];
  }[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const templates = await prisma.reorderTemplate.findMany({
      where: { userId: session.user.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                slug: true,
                retailPrice: true,
                images: {
                  select: { url: true },
                  take: 1,
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { lastUsedAt: 'desc' },
    });

    const templatesWithNumbers = templates.map((template) => ({
      ...template,
      items: template.items.map((item) => ({
        ...item,
        product: {
          ...item.product,
          retailPrice: Number(item.product.retailPrice),
        },
      })),
    }));

    return { success: true, templates: templatesWithNumbers };
  } catch (error) {
    console.error('Error fetching templates:', error);
    return { success: false, error: 'Failed to fetch templates' };
  }
}

/**
 * Create a new reorder template
 */
export async function createTemplate(data: {
  name: string;
  description?: string;
  items: { productId: string; quantity: number }[];
}): Promise<{ success: boolean; template?: { id: string }; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!data.name || data.items.length === 0) {
      return { success: false, error: 'Template name and items are required' };
    }

    const template = await prisma.reorderTemplate.create({
      data: {
        userId: session.user.id,
        name: data.name,
        description: data.description || null,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
      select: { id: true },
    });

    revalidatePath('/profile/templates');
    return { success: true, template };
  } catch (error) {
    console.error('Error creating template:', error);
    return { success: false, error: 'Failed to create template' };
  }
}

/**
 * Update a reorder template
 */
export async function updateTemplate(
  id: string,
  data: {
    name?: string;
    description?: string;
    isActive?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // Verify ownership
    const template = await prisma.reorderTemplate.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!template || template.userId !== session.user.id) {
      return { success: false, error: 'Template not found' };
    }

    await prisma.reorderTemplate.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    revalidatePath('/profile/templates');
    return { success: true };
  } catch (error) {
    console.error('Error updating template:', error);
    return { success: false, error: 'Failed to update template' };
  }
}

/**
 * Delete a reorder template
 */
export async function deleteTemplate(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // Verify ownership
    const template = await prisma.reorderTemplate.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!template || template.userId !== session.user.id) {
      return { success: false, error: 'Template not found' };
    }

    await prisma.reorderTemplate.delete({
      where: { id },
    });

    revalidatePath('/profile/templates');
    return { success: true };
  } catch (error) {
    console.error('Error deleting template:', error);
    return { success: false, error: 'Failed to delete template' };
  }
}

/**
 * Use a template (update lastUsedAt)
 */
export async function useTemplate(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // Verify ownership
    const template = await prisma.reorderTemplate.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!template || template.userId !== session.user.id) {
      return { success: false, error: 'Template not found' };
    }

    await prisma.reorderTemplate.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });

    return { success: true };
  } catch (error) {
    console.error('Error using template:', error);
    return { success: false, error: 'Failed to use template' };
  }
}
