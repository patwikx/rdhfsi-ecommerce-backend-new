'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

/**
 * Get dashboard statistics
 */
export async function getDashboardStats() {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Current month stats
    const [currentOrders, lastMonthOrders, totalCustomers, lastMonthCustomers] = await Promise.all([
      prisma.order.findMany({
        where: {
          createdAt: { gte: startOfMonth },
          status: { not: 'CANCELLED' },
        },
        select: {
          totalAmount: true,
        },
      }),
      prisma.order.findMany({
        where: {
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
          status: { not: 'CANCELLED' },
        },
        select: {
          totalAmount: true,
        },
      }),
      prisma.user.count({
        where: {
          role: { in: ['CUSTOMER', 'CORPORATE'] },
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.user.count({
        where: {
          role: { in: ['CUSTOMER', 'CORPORATE'] },
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
      }),
    ]);

    const currentRevenue = currentOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
    const lastMonthRevenue = lastMonthOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0);

    const revenueChange = lastMonthRevenue > 0 
      ? ((currentRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0;

    const ordersChange = lastMonthOrders.length > 0
      ? ((currentOrders.length - lastMonthOrders.length) / lastMonthOrders.length) * 100
      : 0;

    const customersChange = lastMonthCustomers > 0
      ? ((totalCustomers - lastMonthCustomers) / lastMonthCustomers) * 100
      : 0;

    const avgOrderValue = currentOrders.length > 0 ? currentRevenue / currentOrders.length : 0;
    const lastMonthAvg = lastMonthOrders.length > 0 ? lastMonthRevenue / lastMonthOrders.length : 0;
    const aovChange = lastMonthAvg > 0 ? ((avgOrderValue - lastMonthAvg) / lastMonthAvg) * 100 : 0;

    return {
      success: true,
      data: {
        totalRevenue: currentRevenue,
        revenueChange,
        totalOrders: currentOrders.length,
        ordersChange,
        totalCustomers,
        customersChange,
        averageOrderValue: avgOrderValue,
        aovChange,
      },
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return { success: false, error: 'Failed to fetch dashboard stats' };
  }
}

/**
 * Get sales chart data
 */
export async function getSalesChartData(days: number = 30) {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  try {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { not: 'CANCELLED' },
      },
      select: {
        createdAt: true,
        totalAmount: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group by date (use local date to avoid timezone issues)
    const salesByDate = new Map<string, { sales: number; orders: number }>();

    orders.forEach((order) => {
      // Format as YYYY-MM-DD using local date parts (not UTC)
      const year = order.createdAt.getFullYear();
      const month = String(order.createdAt.getMonth() + 1).padStart(2, '0');
      const day = String(order.createdAt.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      
      const existing = salesByDate.get(dateKey) || { sales: 0, orders: 0 };
      salesByDate.set(dateKey, {
        sales: existing.sales + Number(order.totalAmount),
        orders: existing.orders + 1,
      });
    });

    // Convert to array and sort by date
    const chartData = Array.from(salesByDate.entries())
      .map(([date, data]) => ({
        date,
        sales: data.sales,
        orders: data.orders,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { success: true, data: chartData };
  } catch (error) {
    console.error('Error fetching sales chart data:', error);
    return { success: false, error: 'Failed to fetch sales data' };
  }
}

/**
 * Get recent orders
 */
export async function getRecentOrders(limit: number = 5) {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  try {
    const orders = await prisma.order.findMany({
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        items: {
          select: {
            quantity: true,
          },
        },
      },
    });

    const formattedOrders = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customer: order.customerName,
      status: order.status,
      total: Number(order.totalAmount),
      items: order.items.reduce((sum, item) => sum + item.quantity, 0),
      date: order.createdAt,
    }));

    return { success: true, data: formattedOrders };
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    return { success: false, error: 'Failed to fetch recent orders' };
  }
}

/**
 * Get top selling products
 */
export async function getTopProducts(limit: number = 5) {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  try {
    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: {
        quantity: true,
        subtotal: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: limit,
    });

    const productIds = topProducts.map((item) => item.productId);

    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        retailPrice: true,
        images: {
          where: { isPrimary: true },
          take: 1,
          select: { url: true },
        },
        category: {
          select: { name: true },
        },
      },
    });

    const formattedProducts = topProducts.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return {
        id: item.productId,
        name: product?.name || 'Unknown Product',
        sku: product?.sku || '',
        category: product?.category?.name || '',
        image: product?.images[0]?.url || null,
        unitsSold: item._sum.quantity || 0,
        revenue: Number(item._sum.subtotal || 0),
        price: Number(product?.retailPrice || 0),
      };
    });

    return { success: true, data: formattedProducts };
  } catch (error) {
    console.error('Error fetching top products:', error);
    return { success: false, error: 'Failed to fetch top products' };
  }
}

/**
 * Get low stock alerts
 */
export async function getLowStockAlerts(siteId?: string) {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  try {
    const whereClause: any = {
      minStockLevel: { not: null },
      availableQty: {
        lte: prisma.inventory.fields.minStockLevel,
      },
    };

    if (siteId) {
      whereClause.siteId = siteId;
    }

    const lowStockItems = await prisma.inventory.findMany({
      where: whereClause,
      take: 10,
      include: {
        product: {
          select: {
            name: true,
            sku: true,
          },
        },
        site: {
          select: {
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        availableQty: 'asc',
      },
    });

    return { success: true, data: lowStockItems };
  } catch (error) {
    console.error('Error fetching low stock alerts:', error);
    return { success: false, error: 'Failed to fetch low stock alerts' };
  }
}

/**
 * Get frequently bought together products
 */
export async function getFrequentlyBoughtTogether(limit: number = 10) {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  try {
    const productAssociations = await prisma.productAssociation.findMany({
      where: {
        associationType: 'FREQUENTLY_BOUGHT_TOGETHER',
        isActive: true,
      },
      take: limit,
      orderBy: {
        timesOrderedTogether: 'desc',
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            images: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true },
            },
          },
        },
        associatedProduct: {
          select: {
            id: true,
            name: true,
            sku: true,
            images: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true },
            },
          },
        },
      },
    });

    const formattedPairs = productAssociations.map((assoc) => ({
      product1: {
        id: assoc.product.id,
        name: assoc.product.name,
        sku: assoc.product.sku,
        image: assoc.product.images[0]?.url || null,
      },
      product2: {
        id: assoc.associatedProduct.id,
        name: assoc.associatedProduct.name,
        sku: assoc.associatedProduct.sku,
        image: assoc.associatedProduct.images[0]?.url || null,
      },
      timesBoughtTogether: assoc.timesOrderedTogether,
      confidence: Number(assoc.confidence),
    }));

    return { success: true, data: formattedPairs };
  } catch (error) {
    console.error('Error fetching frequently bought together:', error);
    return { success: false, error: 'Failed to fetch product associations' };
  }
}
