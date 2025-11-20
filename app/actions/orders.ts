'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { redeemCoupon } from './coupon';
import { getDefaultTaxRate } from './tax';

interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  name: string;
  sku: string;
}

interface CreateOrderData {
  items: OrderItem[];
  
  // Customer Info
  fullName: string;
  email: string;
  phone: string;
  companyName: string;
  taxId?: string;
  
  // Delivery
  deliveryType: 'delivery' | 'pickup';
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  notes?: string;
  
  // Payment
  paymentMethod: 'po' | 'cod' | 'online';
  poNumber?: string;
  poFileUrl?: string;
  
  // Pricing
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  
  // Coupon (if applied)
  appliedCoupon?: {
    id: string;
    code: string;
    discount: number;
  };
}

export async function createOrder(data: CreateOrderData) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    // Generate order number
    const orderNumber = await generateOrderNumber();

    // Get tax rate details
    const taxRate = await getDefaultTaxRate();

    // Create order with all related data
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId,
        
        // Status
        status: 'PENDING',
        paymentStatus: 'PENDING',
        fulfillmentStatus: 'UNFULFILLED',
        
        // Totals
        subtotal: data.subtotal,
        taxAmount: data.taxAmount,
        shippingAmount: data.shippingAmount,
        discountAmount: data.discountAmount,
        totalAmount: data.totalAmount,
        
        // Customer info
        customerName: data.fullName,
        customerEmail: data.email,
        customerPhone: data.phone,
        companyName: data.companyName,
        
        // Payment
        paymentMethod: data.paymentMethod.toUpperCase(),
        paymentTerms: data.paymentMethod === 'cod' ? 'COD' : data.paymentMethod === 'po' ? 'Net 30' : null,
        paymentDetails: data.poFileUrl ? { poFileUrl: data.poFileUrl } : undefined,
        poNumber: data.poNumber,
        taxId: data.taxId,
        
        // Shipping
        shippingMethod: data.deliveryType === 'delivery' ? 'DELIVERY' : 'PICKUP',
        notes: data.notes,
        
        // Order items
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.price,
            subtotal: item.price * item.quantity,
            productName: item.name,
            productSku: item.sku,
            productBarcode: item.sku, // Using SKU as barcode for now
          })),
        },
        
        // Tax breakdown
        taxBreakdown: {
          create: {
            taxName: taxRate.name,
            taxCode: taxRate.code,
            taxRate: taxRate.rate,
            taxableAmount: data.subtotal - data.discountAmount,
            taxAmount: data.taxAmount,
          },
        },
      },
      include: {
        items: true,
      },
    });

    // If delivery, create/link shipping address
    if (data.deliveryType === 'delivery' && data.address) {
      await prisma.address.create({
        data: {
          userId,
          label: 'Order Address',
          fullName: data.fullName,
          phone: data.phone,
          email: data.email,
          companyName: data.companyName,
          addressLine1: data.address,
          city: data.city || '',
          province: data.province || '',
          postalCode: data.postalCode,
          country: 'Philippines',
          isDefault: false,
          isBilling: false,
        },
      });
    }

    // Redeem coupon if applied
    if (data.appliedCoupon) {
      await redeemCoupon(
        data.appliedCoupon.id,
        order.id,
        data.appliedCoupon.discount
      );
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'PLACE_ORDER',
        description: `Placed order ${orderNumber}`,
        metadata: {
          orderId: order.id,
          orderNumber,
          totalAmount: data.totalAmount,
        },
      },
    });

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
  } catch (error) {
    console.error('Error creating order:', error);
    return {
      success: false,
      error: 'Failed to create order. Please try again.',
    };
  }
}

async function generateOrderNumber(): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // Get count of orders today
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));
  
  const todayOrderCount = await prisma.order.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });
  
  const sequence = String(todayOrderCount + 1).padStart(4, '0');
  
  return `ORD-${year}${month}${day}-${sequence}`;
}

export async function getUserOrders() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    const orders = await prisma.order.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        items: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            subtotal: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Convert Decimal to number for client components
    const serializedOrders = orders.map(order => ({
      ...order,
      subtotal: Number(order.subtotal),
      taxAmount: Number(order.taxAmount),
      shippingAmount: Number(order.shippingAmount),
      discountAmount: Number(order.discountAmount),
      totalAmount: Number(order.totalAmount),
      items: order.items.map(item => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
      })),
    }));

    return { success: true, orders: serializedOrders };
  } catch (error) {
    console.error('Error fetching orders:', error);
    return { success: false, error: 'Failed to fetch orders' };
  }
}

export async function getOrderById(orderId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: session.user.id,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                slug: true,
                images: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
          },
        },
        taxBreakdown: true,
        couponRedemptions: {
          include: {
            coupon: true,
          },
        },
      },
    });

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    // Convert Decimal to number for client components
    const serializedOrder = {
      ...order,
      subtotal: Number(order.subtotal),
      taxAmount: Number(order.taxAmount),
      shippingAmount: Number(order.shippingAmount),
      discountAmount: Number(order.discountAmount),
      totalAmount: Number(order.totalAmount),
      items: order.items.map(item => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
      })),
      taxBreakdown: order.taxBreakdown.map(tax => ({
        ...tax,
        taxRate: Number(tax.taxRate),
        taxableAmount: Number(tax.taxableAmount),
        taxAmount: Number(tax.taxAmount),
      })),
      couponRedemptions: order.couponRedemptions.map(redemption => ({
        ...redemption,
        discountAmount: Number(redemption.discountAmount),
        coupon: {
          ...redemption.coupon,
          discountValue: Number(redemption.coupon.discountValue),
          minPurchaseAmount: redemption.coupon.minPurchaseAmount ? Number(redemption.coupon.minPurchaseAmount) : null,
          maxDiscountAmount: redemption.coupon.maxDiscountAmount ? Number(redemption.coupon.maxDiscountAmount) : null,
        },
      })),
    };

    return { success: true, order: serializedOrder };
  } catch (error) {
    console.error('Error fetching order:', error);
    return { success: false, error: 'Failed to fetch order' };
  }
}
