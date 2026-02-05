'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { CouponType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type CouponListItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discountType: CouponType;
  discountValue: number;
  minPurchaseAmount: number | null;
  maxDiscountAmount: number | null;
  usageCount: number;
  usageLimit: number | null;
  perUserLimit: number | null;
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  isPublic: boolean;
  stackable: boolean;
  createdAt: Date;
};

/**
 * Get all coupons
 */
export async function getAllCoupons(): Promise<ActionResult<CouponListItem[]>> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const couponsData = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const coupons: CouponListItem[] = couponsData.map((coupon) => ({
      ...coupon,
      discountValue: Number(coupon.discountValue),
      minPurchaseAmount: coupon.minPurchaseAmount ? Number(coupon.minPurchaseAmount) : null,
      maxDiscountAmount: coupon.maxDiscountAmount ? Number(coupon.maxDiscountAmount) : null,
    }));

    return { success: true, data: coupons };
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return { success: false, error: 'Failed to fetch coupons' };
  }
}

/**
 * Create coupon
 */
export async function createCoupon(data: {
  code: string;
  name: string;
  description?: string;
  discountType: CouponType;
  discountValue: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  applicableCategories?: string[];
  applicableProducts?: string[];
  excludedCategories?: string[];
  excludedProducts?: string[];
  usageLimit?: number;
  perUserLimit?: number;
  validFrom: Date;
  validUntil: Date;
  isActive?: boolean;
  isPublic?: boolean;
  stackable?: boolean;
}): Promise<ActionResult> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    await prisma.coupon.create({
      data: {
        code: data.code.toUpperCase(),
        name: data.name,
        description: data.description,
        discountType: data.discountType,
        discountValue: new Decimal(data.discountValue),
        minPurchaseAmount: data.minPurchaseAmount ? new Decimal(data.minPurchaseAmount) : null,
        maxDiscountAmount: data.maxDiscountAmount ? new Decimal(data.maxDiscountAmount) : null,
        applicableCategories: data.applicableCategories || [],
        applicableProducts: data.applicableProducts || [],
        excludedCategories: data.excludedCategories || [],
        excludedProducts: data.excludedProducts || [],
        usageLimit: data.usageLimit,
        perUserLimit: data.perUserLimit,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
        isActive: data.isActive ?? true,
        isPublic: data.isPublic ?? true,
        stackable: data.stackable ?? false,
        createdBy: session.user.id,
      },
    });

    revalidatePath('/admin/marketing/coupons');
    return { success: true };
  } catch (error) {
    console.error('Error creating coupon:', error);
    return { success: false, error: 'Failed to create coupon' };
  }
}

/**
 * Update coupon
 */
export async function updateCoupon(
  id: string,
  data: {
    name?: string;
    description?: string;
    discountValue?: number;
    minPurchaseAmount?: number;
    maxDiscountAmount?: number;
    usageLimit?: number;
    perUserLimit?: number;
    validFrom?: Date;
    validUntil?: Date;
    isActive?: boolean;
    isPublic?: boolean;
    stackable?: boolean;
  }
): Promise<ActionResult> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.discountValue !== undefined)
      updateData.discountValue = new Decimal(data.discountValue);
    if (data.minPurchaseAmount !== undefined)
      updateData.minPurchaseAmount = data.minPurchaseAmount
        ? new Decimal(data.minPurchaseAmount)
        : null;
    if (data.maxDiscountAmount !== undefined)
      updateData.maxDiscountAmount = data.maxDiscountAmount
        ? new Decimal(data.maxDiscountAmount)
        : null;
    if (data.usageLimit !== undefined) updateData.usageLimit = data.usageLimit;
    if (data.perUserLimit !== undefined) updateData.perUserLimit = data.perUserLimit;
    if (data.validFrom !== undefined) updateData.validFrom = data.validFrom;
    if (data.validUntil !== undefined) updateData.validUntil = data.validUntil;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;
    if (data.stackable !== undefined) updateData.stackable = data.stackable;

    await prisma.coupon.update({
      where: { id },
      data: updateData,
    });

    revalidatePath('/admin/marketing/coupons');
    return { success: true };
  } catch (error) {
    console.error('Error updating coupon:', error);
    return { success: false, error: 'Failed to update coupon' };
  }
}

/**
 * Delete coupon
 */
export async function deleteCoupon(id: string): Promise<ActionResult> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    await prisma.coupon.delete({
      where: { id },
    });

    revalidatePath('/admin/marketing/coupons');
    return { success: true };
  } catch (error) {
    console.error('Error deleting coupon:', error);
    return { success: false, error: 'Failed to delete coupon' };
  }
}

/**
 * Toggle coupon status
 */
export async function toggleCouponStatus(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    await prisma.coupon.update({
      where: { id },
      data: { isActive },
    });

    revalidatePath('/admin/marketing/coupons');
    return { success: true };
  } catch (error) {
    console.error('Error toggling coupon status:', error);
    return { success: false, error: 'Failed to update coupon status' };
  }
}
