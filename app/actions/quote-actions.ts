'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

type QuoteStatus = 'PENDING' | 'REVIEWED' | 'QUOTED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

/**
 * Get all quotes with filters
 */
export async function getAllQuotes(filters?: {
  status?: QuoteStatus;
  search?: string;
}): Promise<ActionResult<{
  id: string;
  quoteNumber: string;
  customerName: string;
  customerEmail: string;
  companyName: string | null;
  status: QuoteStatus;
  subtotal: number | null;
  totalAmount: number | null;
  quotedPrice: number | null;
  validUntil: Date | null;
  createdAt: Date;
  respondedAt: Date | null;
  itemCount: number;
}[]>> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const quotesData = await prisma.quote.findMany({
      where: {
        ...(filters?.status && { status: filters.status }),
        ...(filters?.search && {
          OR: [
            { customerName: { contains: filters.search, mode: 'insensitive' } },
            { customerEmail: { contains: filters.search, mode: 'insensitive' } },
            { quoteNumber: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        items: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const quotes = quotesData.map(quote => ({
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      customerName: quote.customerName,
      customerEmail: quote.customerEmail,
      companyName: quote.companyName,
      status: quote.status as QuoteStatus,
      subtotal: quote.subtotal ? Number(quote.subtotal) : null,
      totalAmount: quote.totalAmount ? Number(quote.totalAmount) : null,
      quotedPrice: quote.quotedPrice ? Number(quote.quotedPrice) : null,
      validUntil: quote.validUntil,
      createdAt: quote.createdAt,
      respondedAt: quote.respondedAt,
      itemCount: quote.items.length,
    }));

    return { success: true, data: quotes };
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return { success: false, error: 'Failed to fetch quotes' };
  }
}

/**
 * Get quote by ID
 */
export async function getQuoteById(id: string): Promise<ActionResult<{
  id: string;
  quoteNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  companyName: string | null;
  status: QuoteStatus;
  message: string | null;
  adminNotes: string | null;
  quotedPrice: number | null;
  validUntil: Date | null;
  createdAt: Date;
  respondedAt: Date | null;
  items: {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    notes: string | null;
  }[];
}>> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!quote) {
      return { success: false, error: 'Quote not found' };
    }

    const formattedQuote = {
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      customerName: quote.customerName,
      customerEmail: quote.customerEmail,
      customerPhone: quote.customerPhone,
      companyName: quote.companyName,
      status: quote.status as QuoteStatus,
      message: quote.message,
      adminNotes: quote.adminNotes,
      quotedPrice: quote.quotedPrice ? Number(quote.quotedPrice) : null,
      validUntil: quote.validUntil,
      createdAt: quote.createdAt,
      respondedAt: quote.respondedAt,
      items: quote.items.map(item => ({
        id: item.id,
        productId: item.product?.id || '',
        productName: item.product?.name || 'Unknown Product',
        quantity: item.quantity,
        notes: item.notes,
      })),
    };

    return { success: true, data: formattedQuote };
  } catch (error) {
    console.error('Error fetching quote:', error);
    return { success: false, error: 'Failed to fetch quote' };
  }
}

/**
 * Update quote status and respond
 */
export async function respondToQuote(
  quoteId: string,
  data: {
    status: QuoteStatus;
    quotedPrice?: number;
    validUntil?: Date;
    adminNotes?: string;
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
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      select: {
        id: true,
        quoteNumber: true,
        userId: true,
      },
    });

    if (!quote) {
      return { success: false, error: 'Quote not found' };
    }

    await prisma.quote.update({
      where: { id: quoteId },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.quotedPrice !== undefined && { quotedPrice: data.quotedPrice }),
        ...(data.validUntil && { validUntil: data.validUntil }),
        ...(data.adminNotes && { adminNotes: data.adminNotes }),
        respondedBy: session.user.id,
        respondedAt: new Date(),
      },
    });

    // Create notification for customer
    if (quote.userId) {
      let notificationType: 'QUOTE_RESPONDED' | 'QUOTE_DECLINED' = 'QUOTE_RESPONDED';
      let title = 'Quote Response Received';
      let message = `Your quote request #${quote.quoteNumber} has been responded to.`;

      if (data.status === 'DECLINED') {
        notificationType = 'QUOTE_DECLINED';
        title = 'Quote Request Declined';
        message = `Your quote request #${quote.quoteNumber} has been declined.`;
      }

      try {
        await prisma.notification.create({
          data: {
            userId: quote.userId,
            type: notificationType,
            title: title,
            message: message,
            link: `/quotes/${quote.id}`,
            referenceType: 'QUOTE',
            referenceId: quote.id,
            isRead: false,
          },
        });
      } catch (error) {
        console.error('Error creating quote notification:', error);
      }
    }

    revalidatePath('/admin/quotes');
    revalidatePath(`/admin/quotes/${quoteId}`);
    
    return { success: true };
  } catch (error) {
    console.error('Error responding to quote:', error);
    return { success: false, error: 'Failed to respond to quote' };
  }
}
