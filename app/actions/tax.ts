'use server';

import { prisma } from '@/lib/prisma';

export async function getDefaultTaxRate() {
  try {
    const taxRate = await prisma.taxRate.findFirst({
      where: {
        isDefault: true,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        rate: true,
      },
    });

    if (!taxRate) {
      // Fallback to VAT12 if no default is set
      const vat12 = await prisma.taxRate.findUnique({
        where: { code: 'VAT12' },
        select: {
          id: true,
          name: true,
          code: true,
          rate: true,
        },
      });

      return vat12 
        ? { id: vat12.id, name: vat12.name, code: vat12.code, rate: Number(vat12.rate) }
        : { id: '', name: 'VAT 12%', code: 'VAT12', rate: 12.00 };
    }

    return {
      id: taxRate.id,
      name: taxRate.name,
      code: taxRate.code,
      rate: Number(taxRate.rate), // Convert Decimal to number
    };
  } catch (error) {
    console.error('Error fetching tax rate:', error);
    // Fallback to 12% if database query fails
    return { id: '', name: 'VAT 12%', code: 'VAT12', rate: 12.00 };
  }
}

export async function calculateTax(amount: number) {
  const taxRate = await getDefaultTaxRate();
  const taxAmount = (amount * Number(taxRate.rate)) / 100;
  
  return {
    taxRate: taxRate,
    taxAmount: taxAmount,
  };
}
