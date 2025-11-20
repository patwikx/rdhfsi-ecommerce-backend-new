'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const bannerSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  image: z.string().url('Valid image URL is required'),
  images: z.array(z.string().url()).min(1, 'At least one image is required'),
  link: z.string().url().optional().or(z.literal('')),
  buttonText: z.string().optional(),
  placement: z.enum(['HOME', 'TRENDING', 'SALE', 'CLEARANCE', 'FEATURED', 'NEW_ARRIVALS', 'BRANDS', 'CATEGORY', 'SEARCH']),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
  textColor: z.string().optional(),
  overlayColor: z.string().optional(),
});

export async function createBanner(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    const startDateStr = formData.get('startDate') as string;
    const endDateStr = formData.get('endDate') as string;
    const imagesStr = formData.get('images') as string;

    const data = {
      title: formData.get('title'),
      description: formData.get('description') || undefined,
      image: formData.get('image'),
      images: imagesStr ? JSON.parse(imagesStr) : [],
      link: formData.get('link') || '',
      buttonText: formData.get('buttonText') || undefined,
      placement: formData.get('placement'),
      startDate: startDateStr ? new Date(startDateStr) : undefined,
      endDate: endDateStr ? new Date(endDateStr) : undefined,
      isActive: formData.get('isActive') === 'true',
      sortOrder: parseInt(formData.get('sortOrder') as string) || 0,
      textColor: formData.get('textColor') || undefined,
      overlayColor: formData.get('overlayColor') || undefined,
    };

    const validated = bannerSchema.parse(data);

    if (validated.endDate && validated.startDate && validated.endDate <= validated.startDate) {
      return { success: false, error: 'End date must be after start date' };
    }

    await prisma.heroBanner.create({
      data: {
        ...validated,
        createdBy: session.user.id,
      },
    });

    revalidatePath('/admin/marketing/banners');
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: 'Failed to create banner' };
  }
}

export async function updateBanner(id: string, formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    const startDateStr = formData.get('startDate') as string;
    const endDateStr = formData.get('endDate') as string;
    const imagesStr = formData.get('images') as string;

    const data = {
      title: formData.get('title'),
      description: formData.get('description') || undefined,
      image: formData.get('image'),
      images: imagesStr ? JSON.parse(imagesStr) : [],
      link: formData.get('link') || '',
      buttonText: formData.get('buttonText') || undefined,
      placement: formData.get('placement'),
      startDate: startDateStr ? new Date(startDateStr) : undefined,
      endDate: endDateStr ? new Date(endDateStr) : undefined,
      isActive: formData.get('isActive') === 'true',
      sortOrder: parseInt(formData.get('sortOrder') as string) || 0,
      textColor: formData.get('textColor') || undefined,
      overlayColor: formData.get('overlayColor') || undefined,
    };

    const validated = bannerSchema.parse(data);

    if (validated.endDate && validated.startDate && validated.endDate <= validated.startDate) {
      return { success: false, error: 'End date must be after start date' };
    }

    await prisma.heroBanner.update({
      where: { id },
      data: validated,
    });

    revalidatePath('/admin/marketing/banners');
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: 'Failed to update banner' };
  }
}

export async function deleteBanner(id: string) {
  try {
    const session = await auth();
    if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    await prisma.heroBanner.delete({
      where: { id },
    });

    revalidatePath('/admin/marketing/banners');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to delete banner' };
  }
}

export async function toggleBannerStatus(id: string) {
  try {
    const session = await auth();
    if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    const banner = await prisma.heroBanner.findUnique({
      where: { id },
    });

    if (!banner) {
      return { success: false, error: 'Banner not found' };
    }

    await prisma.heroBanner.update({
      where: { id },
      data: { isActive: !banner.isActive },
    });

    revalidatePath('/admin/marketing/banners');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to toggle banner status' };
  }
}

export async function getAllBanners() {
  try {
    const session = await auth();
    if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    const banners = await prisma.heroBanner.findMany({
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return { success: true, data: banners };
  } catch (error) {
    return { success: false, error: 'Failed to fetch banners' };
  }
}
