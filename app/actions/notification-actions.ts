'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Get admin notifications (new orders and quotations)
 */
export async function getAdminNotifications(): Promise<ActionResult<{
  newOrders: {
    id: string;
    orderNumber: string;
    customerName: string;
    total: number;
    createdAt: Date;
  }[];
  newQuotes: {
    id: string;
    quoteNumber: string;
    customerName: string;
    status: string;
    createdAt: Date;
  }[];
  totalCount: number;
}>> {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
      return { success: false, error: 'Insufficient permissions' };
    }

    // Get new orders from last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const newOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: oneDayAgo,
        },
        status: 'PENDING',
      },
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        customerName: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    // Get new quotes from last 24 hours
    const newQuotes = await prisma.quote.findMany({
      where: {
        createdAt: {
          gte: oneDayAgo,
        },
        status: 'PENDING',
      },
      select: {
        id: true,
        quoteNumber: true,
        status: true,
        customerName: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    const formattedOrders = newOrders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      total: Number(order.totalAmount),
      createdAt: order.createdAt,
    }));

    const formattedQuotes = newQuotes.map(quote => ({
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      customerName: quote.customerName,
      status: quote.status,
      createdAt: quote.createdAt,
    }));

    return {
      success: true,
      data: {
        newOrders: formattedOrders,
        newQuotes: formattedQuotes,
        totalCount: formattedOrders.length + formattedQuotes.length,
      },
    };
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    return { success: false, error: 'Failed to fetch notifications' };
  }
}
