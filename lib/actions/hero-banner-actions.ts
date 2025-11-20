'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { BannerPlacement } from '@prisma/client';

interface HeroBanner {
  id: string;
  title: string;
  description: string | null;
  image: string;
  link: string | null;
  buttonText: string | null;
  placement: BannerPlacement;
  sortOrder: number;
  textColor: string | null;
  overlayColor: string | null;
}

/**
 * Get active hero banners for a specific placement
 */
export async function getHeroBanners(placement: BannerPlacement): Promise<{
  success: boolean;
  banners?: HeroBanner[];
  error?: string;
}> {
  try {
    const now = new Date();

    const banners = await prisma.heroBanner.findMany({
      where: {
        placement,
        isActive: true,
        OR: [
          {
            AND: [
              { startDate: { lte: now } },
              { endDate: { gte: now } },
            ],
          },
          {
            AND: [
              { startDate: null },
              { endDate: null },
            ],
          },
          {
            AND: [
              { startDate: { lte: now } },
              { endDate: null },
            ],
          },
          {
            AND: [
              { startDate: null },
              { endDate: { gte: now } },
            ],
          },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        image: true,
        link: true,
        buttonText: true,
        placement: true,
        sortOrder: true,
        textColor: true,
        overlayColor: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });

    return { success: true, banners };
  } catch (error) {
    console.error('Error fetching hero banners:', error);
    return { success: false, error: 'Failed to fetch banners' };
  }
}

/**
 * Get all hero banners (admin only)
 */
export async function getAllHeroBanners(): Promise<{
  success: boolean;
  banners?: {
    id: string;
    title: string;
    description: string | null;
    image: string;
    link: string | null;
    buttonText: string | null;
    placement: BannerPlacement;
    sortOrder: number;
    isActive: boolean;
    startDate: Date | null;
    endDate: Date | null;
    textColor: string | null;
    overlayColor: string | null;
    createdAt: Date;
    updatedAt: Date;
  }[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' };
    }

    const banners = await prisma.heroBanner.findMany({
      orderBy: [{ placement: 'asc' }, { sortOrder: 'asc' }],
    });

    return { success: true, banners };
  } catch (error) {
    console.error('Error fetching all banners:', error);
    return { success: false, error: 'Failed to fetch banners' };
  }
}

/**
 * Create a new hero banner (admin only)
 */
export async function createHeroBanner(data: {
  title: string;
  description?: string;
  image: string;
  link?: string;
  buttonText?: string;
  placement: BannerPlacement;
  sortOrder?: number;
  isActive?: boolean;
  startDate?: Date;
  endDate?: Date;
  textColor?: string;
  overlayColor?: string;
}): Promise<{ success: boolean; banner?: { id: string }; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' };
    }

    const banner = await prisma.heroBanner.create({
      data: {
        title: data.title,
        description: data.description || null,
        image: data.image,
        link: data.link || null,
        buttonText: data.buttonText || null,
        placement: data.placement,
        sortOrder: data.sortOrder || 0,
        isActive: data.isActive ?? true,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        textColor: data.textColor || null,
        overlayColor: data.overlayColor || null,
        createdBy: session.user.id,
      },
      select: {
        id: true,
      },
    });

    return { success: true, banner };
  } catch (error) {
    console.error('Error creating banner:', error);
    return { success: false, error: 'Failed to create banner' };
  }
}

/**
 * Update a hero banner (admin only)
 */
export async function updateHeroBanner(
  id: string,
  data: {
    title?: string;
    description?: string;
    image?: string;
    link?: string;
    buttonText?: string;
    placement?: BannerPlacement;
    sortOrder?: number;
    isActive?: boolean;
    startDate?: Date | null;
    endDate?: Date | null;
    textColor?: string;
    overlayColor?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' };
    }

    await prisma.heroBanner.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.image && { image: data.image }),
        ...(data.link !== undefined && { link: data.link || null }),
        ...(data.buttonText !== undefined && { buttonText: data.buttonText || null }),
        ...(data.placement && { placement: data.placement }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.startDate !== undefined && { startDate: data.startDate }),
        ...(data.endDate !== undefined && { endDate: data.endDate }),
        ...(data.textColor !== undefined && { textColor: data.textColor || null }),
        ...(data.overlayColor !== undefined && { overlayColor: data.overlayColor || null }),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating banner:', error);
    return { success: false, error: 'Failed to update banner' };
  }
}

/**
 * Delete a hero banner (admin only)
 */
export async function deleteHeroBanner(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' };
    }

    await prisma.heroBanner.delete({
      where: { id },
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting banner:', error);
    return { success: false, error: 'Failed to delete banner' };
  }
}

/**
 * Toggle banner active status (admin only)
 */
export async function toggleBannerStatus(id: string): Promise<{
  success: boolean;
  isActive?: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' };
    }

    const banner = await prisma.heroBanner.findUnique({
      where: { id },
      select: { isActive: true },
    });

    if (!banner) {
      return { success: false, error: 'Banner not found' };
    }

    const updated = await prisma.heroBanner.update({
      where: { id },
      data: { isActive: !banner.isActive },
      select: { isActive: true },
    });

    return { success: true, isActive: updated.isActive };
  } catch (error) {
    console.error('Error toggling banner status:', error);
    return { success: false, error: 'Failed to toggle status' };
  }
}
