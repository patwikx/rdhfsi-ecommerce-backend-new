'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

/**
 * Get all quotes for the current user
 */
export async function getUserQuotes(): Promise<{
  success: boolean;
  quotes?: {
    id: string;
    quoteNumber: string;
    status: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    companyName: string | null;
    message: string | null;
    subtotal: number | null;
    totalAmount: number | null;
    quotedPrice: number | null;
    validUntil: Date | null;
    createdAt: Date;
    items: {
      id: string;
      productName: string;
      quantity: number;
      quotedPrice: number | null;
    }[];
  }[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const quotes = await prisma.quote.findMany({
      where: { userId: session.user.id },
      include: {
        items: {
          select: {
            id: true,
            productName: true,
            quantity: true,
            quotedPrice: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const quotesWithNumbers = quotes.map((quote) => ({
      ...quote,
      subtotal: quote.subtotal ? Number(quote.subtotal) : null,
      totalAmount: quote.totalAmount ? Number(quote.totalAmount) : null,
      quotedPrice: quote.quotedPrice ? Number(quote.quotedPrice) : null,
      items: quote.items.map((item) => ({
        ...item,
        quotedPrice: item.quotedPrice ? Number(item.quotedPrice) : null,
      })),
    }));

    return { success: true, quotes: quotesWithNumbers };
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return { success: false, error: 'Failed to fetch quotes' };
  }
}

/**
 * Get a single quote by ID
 */
export async function getQuoteById(id: string): Promise<{
  success: boolean;
  quote?: {
    id: string;
    quoteNumber: string;
    status: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    companyName: string | null;
    message: string | null;
    subtotal: number | null;
    taxAmount: number | null;
    shippingAmount: number | null;
    totalAmount: number | null;
    quotedPrice: number | null;
    adminNotes: string | null;
    validUntil: Date | null;
    respondedAt: Date | null;
    createdAt: Date;
    items: {
      id: string;
      productId: string | null;
      productName: string;
      quantity: number;
      notes: string | null;
      quotedPrice: number | null;
      product: {
        id: string;
        name: string;
        slug: string;
        sku: string;
        retailPrice: number;
      } | null;
    }[];
  };
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                sku: true,
                retailPrice: true,
              },
            },
          },
        },
      },
    });

    if (!quote || quote.userId !== session.user.id) {
      return { success: false, error: 'Quote not found' };
    }

    const quoteWithNumbers = {
      ...quote,
      subtotal: quote.subtotal ? Number(quote.subtotal) : null,
      taxAmount: quote.taxAmount ? Number(quote.taxAmount) : null,
      shippingAmount: quote.shippingAmount ? Number(quote.shippingAmount) : null,
      totalAmount: quote.totalAmount ? Number(quote.totalAmount) : null,
      quotedPrice: quote.quotedPrice ? Number(quote.quotedPrice) : null,
      items: quote.items.map((item) => ({
        ...item,
        quotedPrice: item.quotedPrice ? Number(item.quotedPrice) : null,
        product: item.product
          ? {
              ...item.product,
              retailPrice: Number(item.product.retailPrice),
            }
          : null,
      })),
    };

    return { success: true, quote: quoteWithNumbers };
  } catch (error) {
    console.error('Error fetching quote:', error);
    return { success: false, error: 'Failed to fetch quote' };
  }
}

/**
 * Create a new quote request
 */
export async function createQuote(data: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  companyName?: string;
  message?: string;
  items: { productId?: string; productName: string; quantity: number; notes?: string }[];
}): Promise<{ success: boolean; quote?: { id: string; quoteNumber: string }; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    if (data.items.length === 0) {
      return { success: false, error: 'At least one item is required' };
    }

    // Generate quote number
    const count = await prisma.quote.count();
    const quoteNumber = `QT-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        userId: session.user.id,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        companyName: data.companyName || null,
        message: data.message || null,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId || null,
            productName: item.productName,
            quantity: item.quantity,
            notes: item.notes || null,
          })),
        },
      },
      select: {
        id: true,
        quoteNumber: true,
      },
    });

    revalidatePath('/profile/quotes');
    return { success: true, quote };
  } catch (error) {
    console.error('Error creating quote:', error);
    return { success: false, error: 'Failed to create quote' };
  }
}
