import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getAllOrders } from '@/app/actions/order-actions';
import { OrderList } from '@/components/admin/orders/order-list';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Clock, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Orders | Admin',
  description: 'Manage customer orders',
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    status?: string;
    paymentStatus?: string;
    search?: string;
  }>;
}) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  const ordersResult = await getAllOrders({
    status: params.status as never,
    paymentStatus: params.paymentStatus as never,
    search: params.search,
  });

  if (!ordersResult.success) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Error Loading Orders</h2>
          <p className="text-muted-foreground">{ordersResult.error}</p>
        </div>
      </div>
    );
  }

  const orders = ordersResult.data || [];

  // Calculate stats
  const pendingCount = orders.filter(o => o.status === 'PENDING').length;
  const processingCount = orders.filter(o => o.status === 'PROCESSING').length;
  const completedCount = orders.filter(o => o.status === 'DELIVERED').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">
            Manage and track customer orders
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
          </div>
          <p className="text-2xl font-bold">{orders.length}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-yellow-600" />
            <p className="text-sm font-medium text-muted-foreground">Pending</p>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-orange-600" />
            <p className="text-sm font-medium text-muted-foreground">Processing</p>
          </div>
          <p className="text-2xl font-bold text-orange-600">{processingCount}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-muted-foreground">Completed</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{completedCount}</p>
        </div>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <OrderList 
          orders={orders}
          userRole={session.user.role}
          currentFilters={{
            status: params.status,
            paymentStatus: params.paymentStatus,
            search: params.search,
          }}
        />
      </Suspense>
    </div>
  );
}
