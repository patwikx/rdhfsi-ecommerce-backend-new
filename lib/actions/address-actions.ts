'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

/**
 * Get all addresses for the current user
 */
export async function getUserAddresses(): Promise<{
  success: boolean;
  addresses?: {
    id: string;
    label: string | null;
    fullName: string;
    phone: string;
    email: string | null;
    companyName: string | null;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    province: string;
    postalCode: string | null;
    country: string;
    isDefault: boolean;
    isBilling: boolean;
  }[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const addresses = await prisma.address.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return { success: true, addresses };
  } catch (error) {
    console.error('Error fetching addresses:', error);
    return { success: false, error: 'Failed to fetch addresses' };
  }
}

/**
 * Create a new address
 */
export async function createAddress(data: {
  label?: string;
  fullName: string;
  phone: string;
  email?: string;
  companyName?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province: string;
  postalCode?: string;
  country?: string;
  isDefault?: boolean;
  isBilling?: boolean;
}): Promise<{ success: boolean; address?: { id: string }; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId: session.user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId: session.user.id,
        label: data.label || null,
        fullName: data.fullName,
        phone: data.phone,
        email: data.email || null,
        companyName: data.companyName || null,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2 || null,
        city: data.city,
        province: data.province,
        postalCode: data.postalCode || null,
        country: data.country || 'Philippines',
        isDefault: data.isDefault || false,
        isBilling: data.isBilling || false,
      },
      select: { id: true },
    });

    revalidatePath('/profile/addresses');
    return { success: true, address };
  } catch (error) {
    console.error('Error creating address:', error);
    return { success: false, error: 'Failed to create address' };
  }
}

/**
 * Update an address
 */
export async function updateAddress(
  id: string,
  data: {
    label?: string;
    fullName?: string;
    phone?: string;
    email?: string;
    companyName?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
    isDefault?: boolean;
    isBilling?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // Verify ownership
    const address = await prisma.address.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!address || address.userId !== session.user.id) {
      return { success: false, error: 'Address not found' };
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId: session.user.id, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    await prisma.address.update({
      where: { id },
      data: {
        ...(data.label !== undefined && { label: data.label || null }),
        ...(data.fullName && { fullName: data.fullName }),
        ...(data.phone && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.companyName !== undefined && { companyName: data.companyName || null }),
        ...(data.addressLine1 && { addressLine1: data.addressLine1 }),
        ...(data.addressLine2 !== undefined && { addressLine2: data.addressLine2 || null }),
        ...(data.city && { city: data.city }),
        ...(data.province && { province: data.province }),
        ...(data.postalCode !== undefined && { postalCode: data.postalCode || null }),
        ...(data.country && { country: data.country }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
        ...(data.isBilling !== undefined && { isBilling: data.isBilling }),
      },
    });

    revalidatePath('/profile/addresses');
    return { success: true };
  } catch (error) {
    console.error('Error updating address:', error);
    return { success: false, error: 'Failed to update address' };
  }
}

/**
 * Delete an address
 */
export async function deleteAddress(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // Verify ownership
    const address = await prisma.address.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!address || address.userId !== session.user.id) {
      return { success: false, error: 'Address not found' };
    }

    await prisma.address.delete({
      where: { id },
    });

    revalidatePath('/profile/addresses');
    return { success: true };
  } catch (error) {
    console.error('Error deleting address:', error);
    return { success: false, error: 'Failed to delete address' };
  }
}

/**
 * Set an address as default
 */
export async function setDefaultAddress(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // Verify ownership
    const address = await prisma.address.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!address || address.userId !== session.user.id) {
      return { success: false, error: 'Address not found' };
    }

    // Unset all defaults
    await prisma.address.updateMany({
      where: { userId: session.user.id, isDefault: true },
      data: { isDefault: false },
    });

    // Set new default
    await prisma.address.update({
      where: { id },
      data: { isDefault: true },
    });

    revalidatePath('/profile/addresses');
    return { success: true };
  } catch (error) {
    console.error('Error setting default address:', error);
    return { success: false, error: 'Failed to set default address' };
  }
}
