'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { siteFormSchema, type SiteFormValues } from '@/lib/validations/site-validation';

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Get all sites
 */
export async function getAllSites(): Promise<ActionResult<{
  id: string;
  code: string;
  name: string;
  type: string;
  isMarkdown: boolean;
  isActive: boolean;
  address: string | null;
  phone: string | null;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}[]>> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Only ADMIN, MANAGER, STAFF can view sites
  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const sites = await prisma.site.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    return { success: true, data: sites };
  } catch (error) {
    console.error('Error fetching sites:', error);
    return { success: false, error: 'Failed to fetch sites' };
  }
}

/**
 * Get site by ID
 */
export async function getSiteById(id: string): Promise<ActionResult<{
  id: string;
  code: string;
  name: string;
  type: string;
  isMarkdown: boolean;
  isActive: boolean;
  address: string | null;
  phone: string | null;
  email: string | null;
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
    const site = await prisma.site.findUnique({
      where: { id },
    });

    if (!site) {
      return { success: false, error: 'Site not found' };
    }

    return { success: true, data: site };
  } catch (error) {
    console.error('Error fetching site:', error);
    return { success: false, error: 'Failed to fetch site' };
  }
}

/**
 * Create a new site
 */
export async function createSite(data: SiteFormValues): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Only ADMIN can create sites
  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Only admins can create sites' };
  }

  try {
    // Validate data
    const validatedData = siteFormSchema.parse(data);

    // Check if code already exists
    const existingCode = await prisma.site.findUnique({
      where: { code: validatedData.code },
    });

    if (existingCode) {
      return { success: false, error: 'Site code already exists' };
    }

    // Create site
    const site = await prisma.site.create({
      data: validatedData,
    });

    revalidatePath('/admin/sites');
    
    return { success: true, data: { id: site.id } };
  } catch (error) {
    console.error('Error creating site:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to create site' };
  }
}

/**
 * Update a site
 */
export async function updateSite(id: string, data: SiteFormValues): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Only ADMIN can update sites
  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Only admins can update sites' };
  }

  try {
    // Validate data
    const validatedData = siteFormSchema.parse(data);

    // Check if site exists
    const existingSite = await prisma.site.findUnique({
      where: { id },
    });

    if (!existingSite) {
      return { success: false, error: 'Site not found' };
    }

    // Check if code is being changed and if it already exists
    if (validatedData.code !== existingSite.code) {
      const existingCode = await prisma.site.findUnique({
        where: { code: validatedData.code },
      });

      if (existingCode) {
        return { success: false, error: 'Site code already exists' };
      }
    }

    // Update site
    const site = await prisma.site.update({
      where: { id },
      data: validatedData,
    });

    revalidatePath('/admin/sites');
    revalidatePath(`/admin/sites/${id}`);
    
    return { success: true, data: { id: site.id } };
  } catch (error) {
    console.error('Error updating site:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to update site' };
  }
}

/**
 * Delete a site
 */
export async function deleteSite(id: string): Promise<ActionResult> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Only ADMIN can delete sites
  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Only admins can delete sites' };
  }

  try {
    // Check if site has inventory
    const inventoryCount = await prisma.inventory.count({
      where: { siteId: id },
    });

    if (inventoryCount > 0) {
      return { success: false, error: 'Cannot delete site with existing inventory' };
    }

    // Delete site
    await prisma.site.delete({
      where: { id },
    });

    revalidatePath('/admin/sites');
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting site:', error);
    return { success: false, error: 'Failed to delete site' };
  }
}

/**
 * Toggle site active status
 */
export async function toggleSiteStatus(id: string): Promise<ActionResult> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Only admins can toggle site status' };
  }

  try {
    const site = await prisma.site.findUnique({
      where: { id },
    });

    if (!site) {
      return { success: false, error: 'Site not found' };
    }

    await prisma.site.update({
      where: { id },
      data: { isActive: !site.isActive },
    });

    revalidatePath('/admin/sites');
    
    return { success: true };
  } catch (error) {
    console.error('Error toggling site status:', error);
    return { success: false, error: 'Failed to toggle site status' };
  }
}
