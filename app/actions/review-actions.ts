'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export type ReviewListItem = {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title: string | null;
  comment: string | null;
  images: string[];
  isVerified: boolean;
  isApproved: boolean;
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
  user: {
    name: string | null;
    email: string;
  };
  product: {
    name: string;
    sku: string;
  };
};

export async function getAllReviews(filter?: 'pending' | 'approved' | 'all') {
  try {
    const session = await auth();
    if (!session?.user || !['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    const where = filter === 'pending' 
      ? { isApproved: false }
      : filter === 'approved'
      ? { isApproved: true }
      : {};

    const reviews = await prisma.review.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        product: {
          select: {
            name: true,
            sku: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { success: true, data: reviews as ReviewListItem[] };
  } catch (error) {
    return { success: false, error: 'Failed to fetch reviews' };
  }
}

export async function approveReview(id: string) {
  try {
    const session = await auth();
    if (!session?.user || !['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    await prisma.review.update({
      where: { id },
      data: { isApproved: true },
    });

    revalidatePath('/admin/reviews');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to approve review' };
  }
}

export async function rejectReview(id: string) {
  try {
    const session = await auth();
    if (!session?.user || !['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    await prisma.review.update({
      where: { id },
      data: { isApproved: false },
    });

    revalidatePath('/admin/reviews');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to reject review' };
  }
}

export async function deleteReview(id: string) {
  try {
    const session = await auth();
    if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    await prisma.review.delete({
      where: { id },
    });

    revalidatePath('/admin/reviews');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to delete review' };
  }
}

export async function bulkApproveReviews(ids: string[]) {
  try {
    const session = await auth();
    if (!session?.user || !['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    await prisma.review.updateMany({
      where: { id: { in: ids } },
      data: { isApproved: true },
    });

    revalidatePath('/admin/reviews');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to approve reviews' };
  }
}

export async function bulkDeleteReviews(ids: string[]) {
  try {
    const session = await auth();
    if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    await prisma.review.deleteMany({
      where: { id: { in: ids } },
    });

    revalidatePath('/admin/reviews');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to delete reviews' };
  }
}
