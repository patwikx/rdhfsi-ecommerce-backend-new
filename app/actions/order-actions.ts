'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { OrderStatus, PaymentStatus, FulfillmentStatus } from '@prisma/client';

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Get all orders with filters
 */
export async function getAllOrders(filters?: {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  search?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<ActionResult<{
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  createdAt: Date;
  items: {
    id: string;
    quantity: number;
    productName: string;
  }[];
}[]>> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const where: {
      status?: OrderStatus;
      paymentStatus?: PaymentStatus;
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
      OR?: Array<{
        orderNumber?: { contains: string; mode: 'insensitive' };
        customerName?: { contains: string; mode: 'insensitive' };
        customerEmail?: { contains: string; mode: 'insensitive' };
      }>;
    } = {};
    
    if (filters?.status) where.status = filters.status;
    if (filters?.paymentStatus) where.paymentStatus = filters.paymentStatus;
    
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }
    
    if (filters?.search) {
      where.OR = [
        { orderNumber: { contains: filters.search, mode: 'insensitive' } },
        { customerName: { contains: filters.search, mode: 'insensitive' } },
        { customerEmail: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const ordersData = await prisma.order.findMany({
      where,
      include: {
        items: {
          select: {
            id: true,
            quantity: true,
            productName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const orders = ordersData.map(order => ({
      ...order,
      subtotal: Number(order.subtotal),
      taxAmount: Number(order.taxAmount),
      shippingAmount: Number(order.shippingAmount),
      discountAmount: Number(order.discountAmount),
      totalAmount: Number(order.totalAmount),
    }));

    return { success: true, data: orders };
  } catch (error) {
    console.error('Error fetching orders:', error);
    return { success: false, error: 'Failed to fetch orders' };
  }
}

/**
 * Get order by ID
 */
export async function getOrderById(id: string): Promise<ActionResult<{
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  companyName: string | null;
  shippingMethod: string | null;
  trackingNumber: string | null;
  paymentMethod: string | null;
  paymentDetails: unknown;
  poNumber: string | null;
  notes: string | null;
  internalNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  shippedAt: Date | null;
  cancelledAt: Date | null;
  items: {
    id: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    productName: string;
    productSku: string;
    productBarcode: string;
  }[];
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    province: string;
    postalCode: string | null;
  } | null;
}>> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const orderData = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        shippingAddress: {
          select: {
            fullName: true,
            phone: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            province: true,
            postalCode: true,
          },
        },
      },
    });

    if (!orderData) {
      return { success: false, error: 'Order not found' };
    }

    const order = {
      ...orderData,
      subtotal: Number(orderData.subtotal),
      taxAmount: Number(orderData.taxAmount),
      shippingAmount: Number(orderData.shippingAmount),
      discountAmount: Number(orderData.discountAmount),
      totalAmount: Number(orderData.totalAmount),
      items: orderData.items.map(item => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
      })),
    };

    return { success: true, data: order };
  } catch (error) {
    console.error('Error fetching order:', error);
    return { success: false, error: 'Failed to fetch order' };
  }
}

/**
 * Create notification for user
 */
async function createNotification(
  userId: string,
  type: 'ORDER_CONFIRMED' | 'ORDER_SHIPPED' | 'ORDER_DELIVERED' | 'ORDER_CANCELLED',
  title: string,
  message: string,
  referenceId: string,
  link?: string
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link,
        referenceType: 'ORDER',
        referenceId,
        isRead: false,
      },
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    // Don't throw - notification failure shouldn't break the main operation
  }
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<ActionResult> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    // Get order details for notification
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        userId: true,
        status: true,
      },
    });

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    const updateData: {
      status: OrderStatus;
      completedAt?: Date;
      shippedAt?: Date;
      cancelledAt?: Date;
    } = { status };

    if (status === 'DELIVERED') {
      updateData.completedAt = new Date();
    } else if (status === 'SHIPPED') {
      updateData.shippedAt = new Date();
    } else if (status === 'CANCELLED') {
      updateData.cancelledAt = new Date();
    }

    await prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    // Create notification for customer based on status
    if (order.userId) {
      let notificationType: 'ORDER_CONFIRMED' | 'ORDER_SHIPPED' | 'ORDER_DELIVERED' | 'ORDER_CANCELLED';
      let title: string;
      let message: string;

      switch (status) {
        case 'CONFIRMED':
          notificationType = 'ORDER_CONFIRMED';
          title = 'Order Confirmed';
          message = `Your order #${order.orderNumber} has been confirmed and is being processed.`;
          break;
        case 'SHIPPED':
          notificationType = 'ORDER_SHIPPED';
          title = 'Order Shipped';
          message = `Your order #${order.orderNumber} has been shipped and is on its way!`;
          break;
        case 'DELIVERED':
          notificationType = 'ORDER_DELIVERED';
          title = 'Order Delivered';
          message = `Your order #${order.orderNumber} has been delivered. Thank you for your purchase!`;
          break;
        case 'CANCELLED':
          notificationType = 'ORDER_CANCELLED';
          title = 'Order Cancelled';
          message = `Your order #${order.orderNumber} has been cancelled.`;
          break;
        default:
          notificationType = 'ORDER_CONFIRMED';
          title = 'Order Status Updated';
          message = `Your order #${order.orderNumber} status has been updated to ${status}.`;
      }

      await createNotification(
        order.userId,
        notificationType,
        title,
        message,
        order.id,
        `/orders/${order.id}`
      );
    }

    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${orderId}`);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating order status:', error);
    return { success: false, error: 'Failed to update order status' };
  }
}

/**
 * Update payment status
 */
export async function updatePaymentStatus(
  orderId: string,
  paymentStatus: PaymentStatus
): Promise<ActionResult> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus },
    });

    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${orderId}`);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating payment status:', error);
    return { success: false, error: 'Failed to update payment status' };
  }
}

/**
 * Add tracking number
 */
export async function addTrackingNumber(
  orderId: string,
  trackingNumber: string
): Promise<ActionResult> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { 
        trackingNumber,
        status: 'SHIPPED',
        shippedAt: new Date(),
      },
    });

    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${orderId}`);
    
    return { success: true };
  } catch (error) {
    console.error('Error adding tracking number:', error);
    return { success: false, error: 'Failed to add tracking number' };
  }
}

/**
 * Update internal notes
 */
export async function updateInternalNotes(
  orderId: string,
  notes: string
): Promise<ActionResult> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { internalNotes: notes },
    });

    revalidatePath(`/admin/orders/${orderId}`);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating notes:', error);
    return { success: false, error: 'Failed to update notes' };
  }
}
