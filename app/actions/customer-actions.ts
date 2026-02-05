'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { UserRole } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type CustomerListItem = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  companyName: string | null;
  role: UserRole;
  creditLimit: number | null;
  paymentTerms: number | null;
  isActive: boolean;
  createdAt: Date;
  _count: {
    orders: number;
  };
  totalSpent: number;
};

export type CustomerDetails = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  alternativePhone: string | null;
  streetAddress: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  companyName: string | null;
  taxId: string | null;
  creditLimit: number | null;
  paymentTerms: number | null;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    orders: number;
    addresses: number;
    reviews: number;
  };
};

/**
 * Get all customers with filters
 */
export async function getAllCustomers(filters?: {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
}): Promise<ActionResult<CustomerListItem[]>> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const where: {
      role?: { in: UserRole[] };
      isActive?: boolean;
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' };
        email?: { contains: string; mode: 'insensitive' };
        phone?: { contains: string; mode: 'insensitive' };
        companyName?: { contains: string; mode: 'insensitive' };
      }>;
    } = {};

    // Filter by customer roles only
    where.role = { in: ['CUSTOMER', 'CORPORATE'] };

    if (filters?.role) {
      where.role = { in: [filters.role] };
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
        { companyName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const customersData = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        companyName: true,
        role: true,
        creditLimit: true,
        paymentTerms: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            orders: true,
          },
        },
        orders: {
          select: {
            totalAmount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const customers: CustomerListItem[] = customersData.map((customer) => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      companyName: customer.companyName,
      role: customer.role,
      creditLimit: customer.creditLimit ? Number(customer.creditLimit) : null,
      paymentTerms: customer.paymentTerms,
      isActive: customer.isActive,
      createdAt: customer.createdAt,
      _count: customer._count,
      totalSpent: customer.orders.reduce(
        (sum, order) => sum + Number(order.totalAmount),
        0
      ),
    }));

    return { success: true, data: customers };
  } catch (error) {
    console.error('Error fetching customers:', error);
    return { success: false, error: 'Failed to fetch customers' };
  }
}

/**
 * Get customer by ID
 */
export async function getCustomerById(
  id: string
): Promise<ActionResult<CustomerDetails>> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const customerData = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        alternativePhone: true,
        streetAddress: true,
        city: true,
        province: true,
        postalCode: true,
        companyName: true,
        taxId: true,
        creditLimit: true,
        paymentTerms: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orders: true,
            addresses: true,
            reviews: true,
          },
        },
      },
    });

    if (!customerData) {
      return { success: false, error: 'Customer not found' };
    }

    const customer: CustomerDetails = {
      ...customerData,
      creditLimit: customerData.creditLimit
        ? Number(customerData.creditLimit)
        : null,
    };

    return { success: true, data: customer };
  } catch (error) {
    console.error('Error fetching customer:', error);
    return { success: false, error: 'Failed to fetch customer' };
  }
}

/**
 * Get customer orders
 */
export async function getCustomerOrders(customerId: string) {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const ordersData = await prisma.order.findMany({
      where: { userId: customerId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        totalAmount: true,
        createdAt: true,
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const orders = ordersData.map((order) => ({
      ...order,
      totalAmount: Number(order.totalAmount),
    }));

    return { success: true, data: orders };
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    return { success: false, error: 'Failed to fetch customer orders' };
  }
}

/**
 * Update customer information
 */
export async function updateCustomer(
  id: string,
  data: {
    name?: string;
    phone?: string;
    alternativePhone?: string;
    streetAddress?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    companyName?: string;
    taxId?: string;
    creditLimit?: number;
    paymentTerms?: number;
    role?: UserRole;
    isActive?: boolean;
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
    const updateData: {
      name?: string;
      phone?: string;
      alternativePhone?: string;
      streetAddress?: string;
      city?: string;
      province?: string;
      postalCode?: string;
      companyName?: string;
      taxId?: string;
      creditLimit?: Decimal;
      paymentTerms?: number;
      role?: UserRole;
      isActive?: boolean;
    } = {
      name: data.name,
      phone: data.phone,
      alternativePhone: data.alternativePhone,
      streetAddress: data.streetAddress,
      city: data.city,
      province: data.province,
      postalCode: data.postalCode,
      companyName: data.companyName,
      taxId: data.taxId,
      paymentTerms: data.paymentTerms,
      role: data.role,
      isActive: data.isActive,
    };

    if (data.creditLimit !== undefined) {
      updateData.creditLimit = new Decimal(data.creditLimit);
    }

    await prisma.user.update({
      where: { id },
      data: updateData,
    });

    revalidatePath('/admin/customers');
    revalidatePath(`/admin/customers/${id}`);

    return { success: true };
  } catch (error) {
    console.error('Error updating customer:', error);
    return { success: false, error: 'Failed to update customer' };
  }
}

/**
 * Toggle customer active status
 */
export async function toggleCustomerStatus(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    await prisma.user.update({
      where: { id },
      data: { isActive },
    });

    revalidatePath('/admin/customers');
    revalidatePath(`/admin/customers/${id}`);

    return { success: true };
  } catch (error) {
    console.error('Error toggling customer status:', error);
    return { success: false, error: 'Failed to update customer status' };
  }
}

/**
 * Get customer statistics
 */
export async function getCustomerStats(customerId: string) {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const [orders, totalSpentData, recentOrder] = await Promise.all([
      prisma.order.count({
        where: { userId: customerId },
      }),
      prisma.order.aggregate({
        where: { userId: customerId },
        _sum: {
          totalAmount: true,
        },
      }),
      prisma.order.findFirst({
        where: { userId: customerId },
        orderBy: { createdAt: 'desc' },
        select: {
          createdAt: true,
        },
      }),
    ]);

    return {
      success: true,
      data: {
        totalOrders: orders,
        totalSpent: totalSpentData._sum.totalAmount
          ? Number(totalSpentData._sum.totalAmount)
          : 0,
        lastOrderDate: recentOrder?.createdAt || null,
      },
    };
  } catch (error) {
    console.error('Error fetching customer stats:', error);
    return { success: false, error: 'Failed to fetch customer statistics' };
  }
}

/**
 * Get customer activity logs
 */
export async function getCustomerActivity(customerId: string) {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const activities = await prisma.activityLog.findMany({
      where: { userId: customerId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return { success: true, data: activities };
  } catch (error) {
    console.error('Error fetching customer activity:', error);
    return { success: false, error: 'Failed to fetch customer activity' };
  }
}
