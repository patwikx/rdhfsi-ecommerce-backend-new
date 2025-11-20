'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const taxRateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  description: z.string().optional(),
  rate: z.number().min(0).max(100),
  country: z.string().default('Philippines'),
  provinces: z.array(z.string()).default([]),
  cities: z.array(z.string()).default([]),
  applicableCategories: z.array(z.string()).default([]),
  excludedCategories: z.array(z.string()).default([]),
  isDefault: z.boolean().default(false),
  isCompound: z.boolean().default(false),
  priority: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  validFrom: z.date().optional(),
  validUntil: z.date().optional(),
});

export type TaxRateListItem = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  rate: number;
  country: string;
  provinces: string[];
  cities: string[];
  applicableCategories: string[];
  excludedCategories: string[];
  isDefault: boolean;
  isCompound: boolean;
  priority: number;
  isActive: boolean;
  validFrom: Date | null;
  validUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function getAllTaxRates() {
  try {
    const session = await auth();
    if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    const taxRates = await prisma.taxRate.findMany({
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const formattedTaxRates = taxRates.map(rate => ({
      ...rate,
      rate: Number(rate.rate),
    }));

    return { success: true, data: formattedTaxRates as TaxRateListItem[] };
  } catch (error) {
    return { success: false, error: 'Failed to fetch tax rates' };
  }
}

export async function createTaxRate(data: z.infer<typeof taxRateSchema>) {
  try {
    const session = await auth();
    if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    const validated = taxRateSchema.parse(data);

    // If setting as default, unset other defaults
    if (validated.isDefault) {
      await prisma.taxRate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    await prisma.taxRate.create({
      data: validated,
    });

    revalidatePath('/admin/settings/tax');
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: 'Failed to create tax rate' };
  }
}

export async function updateTaxRate(id: string, data: z.infer<typeof taxRateSchema>) {
  try {
    const session = await auth();
    if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    const validated = taxRateSchema.parse(data);

    // If setting as default, unset other defaults
    if (validated.isDefault) {
      await prisma.taxRate.updateMany({
        where: { 
          isDefault: true,
          id: { not: id }
        },
        data: { isDefault: false },
      });
    }

    await prisma.taxRate.update({
      where: { id },
      data: validated,
    });

    revalidatePath('/admin/settings/tax');
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: 'Failed to update tax rate' };
  }
}

export async function deleteTaxRate(id: string) {
  try {
    const session = await auth();
    if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    await prisma.taxRate.delete({
      where: { id },
    });

    revalidatePath('/admin/settings/tax');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to delete tax rate' };
  }
}

export async function toggleTaxRateStatus(id: string) {
  try {
    const session = await auth();
    if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    const taxRate = await prisma.taxRate.findUnique({
      where: { id },
    });

    if (!taxRate) {
      return { success: false, error: 'Tax rate not found' };
    }

    await prisma.taxRate.update({
      where: { id },
      data: { isActive: !taxRate.isActive },
    });

    revalidatePath('/admin/settings/tax');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to toggle tax rate status' };
  }
}
