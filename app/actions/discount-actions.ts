'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { Decimal } from '@prisma/client/runtime/library';

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type DiscountTypeListItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discountPercent: number | null;
  discountAmount: number | null;
  requiresVerification: boolean;
  requiresCode: boolean;
  minPurchaseAmount: number | null;
  maxDiscountAmount: number | null;
  applicableToSale: boolean;
  priority: number;
  isActive: boolean;
  usageCount: number;
  usageLimit: number | null;
  validFrom: Date | null;
  validUntil: Date | null;
  createdAt: Date;
};

/**
 * Get all discount types
 */
export async function getAllDiscountTypes(): Promise<ActionResult<DiscountTypeListItem[]>> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const discountsData = await prisma.discountType.findMany({
      orderBy: { priority: 'desc' },
    });

    const discounts: DiscountTypeListItem[] = discountsData.map((discount) => ({
      ...discount,
      discountPercent: discount.discountPercent ? Number(discount.discountPercent) : null,
      discountAmount: discount.discountAmount ? Number(discount.discountAmount) : null,
      minPurchaseAmount: discount.minPurchaseAmount ? Number(discount.minPurchaseAmount) : null,
      maxDiscountAmount: discount.maxDiscountAmount ? Number(discount.maxDiscountAmount) : null,
    }));

    return { success: true, data: discounts };
  } catch (error) {
    console.error('Error fetching discount types:', error);
    return { success: false, error: 'Failed to fetch discount types' };
  }
}

/**
 * Create discount type
 */
export async function createDiscountType(data: {
  code: string;
  name: string;
  description?: string;
  discountPercent?: number;
  discountAmount?: number;
  requiresVerification?: boolean;
  requiresCode?: boolean;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  applicableToSale?: boolean;
  priority?: number;
  isActive?: boolean;
  validFrom?: Date;
  validUntil?: Date;
  usageLimit?: number;
}): Promise<ActionResult> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    await prisma.discountType.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        discountPercent: data.discountPercent ? new Decimal(data.discountPercent) : null,
        discountAmount: data.discountAmount ? new Decimal(data.discountAmount) : null,
        requiresVerification: data.requiresVerification ?? true,
        requiresCode: data.requiresCode ?? false,
        minPurchaseAmount: data.minPurchaseAmount ? new Decimal(data.minPurchaseAmount) : null,
        maxDiscountAmount: data.maxDiscountAmount ? new Decimal(data.maxDiscountAmount) : null,
        applicableToSale: data.applicableToSale ?? true,
        priority: data.priority ?? 0,
        isActive: data.isActive ?? true,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
        usageLimit: data.usageLimit,
        createdBy: session.user.id,
      },
    });

    revalidatePath('/admin/marketing/discounts');
    return { success: true };
  } catch (error) {
    console.error('Error creating discount type:', error);
    return { success: false, error: 'Failed to create discount type' };
  }
}

/**
 * Update discount type
 */
export async function updateDiscountType(
  id: string,
  data: {
    name?: string;
    description?: string;
    discountPercent?: number;
    discountAmount?: number;
    requiresVerification?: boolean;
    minPurchaseAmount?: number;
    maxDiscountAmount?: number;
    applicableToSale?: boolean;
    priority?: number;
    isActive?: boolean;
    validFrom?: Date;
    validUntil?: Date;
    usageLimit?: number;
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
    if (data.discountPercent !== undefined)
      updateData.discountPercent = data.discountPercent ? new Decimal(data.discountPercent) : null;
    if (data.discountAmount !== undefined)
      updateData.discountAmount = data.discountAmount ? new Decimal(data.discountAmount) : null;
    if (data.requiresVerification !== undefined)
      updateData.requiresVerification = data.requiresVerification;
    if (data.minPurchaseAmount !== undefined)
      updateData.minPurchaseAmount = data.minPurchaseAmount
        ? new Decimal(data.minPurchaseAmount)
        : null;
    if (data.maxDiscountAmount !== undefined)
      updateData.maxDiscountAmount = data.maxDiscountAmount
        ? new Decimal(data.maxDiscountAmount)
        : null;
    if (data.applicableToSale !== undefined) updateData.applicableToSale = data.applicableToSale;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.validFrom !== undefined) updateData.validFrom = data.validFrom;
    if (data.validUntil !== undefined) updateData.validUntil = data.validUntil;
    if (data.usageLimit !== undefined) updateData.usageLimit = data.usageLimit;

    await prisma.discountType.update({
      where: { id },
      data: updateData,
    });

    revalidatePath('/admin/marketing/discounts');
    return { success: true };
  } catch (error) {
    console.error('Error updating discount type:', error);
    return { success: false, error: 'Failed to update discount type' };
  }
}

/**
 * Delete discount type
 */
export async function deleteDiscountType(id: string): Promise<ActionResult> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    await prisma.discountType.delete({
      where: { id },
    });

    revalidatePath('/admin/marketing/discounts');
    return { success: true };
  } catch (error) {
    console.error('Error deleting discount type:', error);
    return { success: false, error: 'Failed to delete discount type' };
  }
}

/**
 * Toggle discount type status
 */
export async function toggleDiscountStatus(
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
    await prisma.discountType.update({
      where: { id },
      data: { isActive },
    });

    revalidatePath('/admin/marketing/discounts');
    return { success: true };
  } catch (error) {
    console.error('Error toggling discount status:', error);
    return { success: false, error: 'Failed to update discount status' };
  }
}
