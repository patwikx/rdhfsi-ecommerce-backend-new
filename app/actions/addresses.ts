'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getUserAddresses() {
  const session = await auth();
  
  if (!session?.user?.email) {
    throw new Error('Unauthorized');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [
      { isDefault: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  return addresses;
}

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
  isDefault?: boolean;
}) {
  const session = await auth();
  
  if (!session?.user?.email) {
    throw new Error('Unauthorized');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // If this is set as default, unset other defaults
  if (data.isDefault) {
    await prisma.address.updateMany({
      where: { userId: user.id, isDefault: true },
      data: { isDefault: false },
    });
  }

  const address = await prisma.address.create({
    data: {
      userId: user.id,
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
      country: 'Philippines',
      isDefault: data.isDefault || false,
      isBilling: false,
    },
  });

  revalidatePath('/profile/settings');
  return address;
}

export async function setDefaultAddress(addressId: string) {
  const session = await auth();
  
  if (!session?.user?.email) {
    throw new Error('Unauthorized');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Verify address belongs to user
  const address = await prisma.address.findFirst({
    where: { id: addressId, userId: user.id },
  });

  if (!address) {
    throw new Error('Address not found');
  }

  // Unset all defaults
  await prisma.address.updateMany({
    where: { userId: user.id, isDefault: true },
    data: { isDefault: false },
  });

  // Set new default
  await prisma.address.update({
    where: { id: addressId },
    data: { isDefault: true },
  });

  revalidatePath('/profile/settings');
}

export async function deleteAddress(addressId: string) {
  const session = await auth();
  
  if (!session?.user?.email) {
    throw new Error('Unauthorized');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Verify address belongs to user
  const address = await prisma.address.findFirst({
    where: { id: addressId, userId: user.id },
  });

  if (!address) {
    throw new Error('Address not found');
  }

  await prisma.address.delete({
    where: { id: addressId },
  });

  revalidatePath('/profile/settings');
}
