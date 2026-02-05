'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

interface CouponValidationResult {
  valid: boolean;
  coupon?: {
    id: string;
    code: string;
    name: string;
    discountType: string;
    discountValue: number;
    minPurchaseAmount: number | null;
    maxDiscountAmount: number | null;
  };
  error?: string;
  discount?: number;
}

export async function validateCoupon(
  code: string,
  subtotal: number
): Promise<CouponValidationResult> {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    // Find the coupon
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
      select: {
        id: true,
        code: true,
        name: true,
        discountType: true,
        discountValue: true,
        minPurchaseAmount: true,
        maxDiscountAmount: true,
        usageLimit: true,
        usageCount: true,
        perUserLimit: true,
        validFrom: true,
        validUntil: true,
        isActive: true,
        redemptions: userId
          ? {
              where: { userId },
              select: { id: true },
            }
          : false,
      },
    });

    if (!coupon) {
      return { valid: false, error: 'Invalid coupon code' };
    }

    // Check if coupon is active
    if (!coupon.isActive) {
      return { valid: false, error: 'This coupon is no longer active' };
    }

    // Check date validity
    const now = new Date();
    if (coupon.validFrom && now < coupon.validFrom) {
      return { valid: false, error: 'This coupon is not yet valid' };
    }
    if (coupon.validUntil && now > coupon.validUntil) {
      return { valid: false, error: 'This coupon has expired' };
    }

    // Check global usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return { valid: false, error: 'This coupon has reached its usage limit' };
    }

    // Check per-user usage limit
    if (userId && coupon.perUserLimit && Array.isArray(coupon.redemptions)) {
      if (coupon.redemptions.length >= coupon.perUserLimit) {
        return {
          valid: false,
          error: 'You have already used this coupon the maximum number of times',
        };
      }
    }

    // Check minimum purchase amount
    if (coupon.minPurchaseAmount && subtotal < Number(coupon.minPurchaseAmount)) {
      return {
        valid: false,
        error: `Minimum purchase of ₱${Number(coupon.minPurchaseAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 })} required`,
      };
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discount = (subtotal * Number(coupon.discountValue)) / 100;
      // Apply max discount cap if set
      if (coupon.maxDiscountAmount && discount > Number(coupon.maxDiscountAmount)) {
        discount = Number(coupon.maxDiscountAmount);
      }
    } else if (coupon.discountType === 'FIXED_AMOUNT') {
      discount = Number(coupon.discountValue);
    }
    // FREE_SHIPPING type returns 0 discount (handled separately in checkout)

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        minPurchaseAmount: coupon.minPurchaseAmount ? Number(coupon.minPurchaseAmount) : null,
        maxDiscountAmount: coupon.maxDiscountAmount ? Number(coupon.maxDiscountAmount) : null,
      },
      discount,
    };
  } catch (error) {
    console.error('Error validating coupon:', error);
    return { valid: false, error: 'Failed to validate coupon' };
  }
}

export async function redeemCoupon(
  couponId: string,
  orderId: string,
  discountAmount: number
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    // Create redemption record
    await prisma.couponRedemption.create({
      data: {
        couponId,
        orderId,
        userId: userId || null,
        discountAmount,
      },
    });

    // Increment usage count
    await prisma.coupon.update({
      where: { id: couponId },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error redeeming coupon:', error);
    return { success: false, error: 'Failed to redeem coupon' };
  }
}

export async function getUserCouponUsage(couponCode: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { count: 0 };
    }

    const count = await prisma.couponRedemption.count({
      where: {
        userId: session.user.id,
        coupon: {
          code: couponCode.toUpperCase(),
        },
      },
    });

    return { count };
  } catch (error) {
    console.error('Error getting coupon usage:', error);
    return { count: 0 };
  }
}
