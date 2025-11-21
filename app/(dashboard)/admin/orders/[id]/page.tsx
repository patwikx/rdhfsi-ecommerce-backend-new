import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getOrderById } from '@/app/actions/order-actions';
import { OrderDetails } from '@/components/admin/orders/order-details';
import { OrderActions } from '@/components/admin/orders/order-actions';
import { OrderTimeline } from '@/components/admin/orders/order-timeline';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Order Details | Admin',
  description: 'View and manage order details',
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  const orderResult = await getOrderById(id);

  if (!orderResult.success || !orderResult.data) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Order Not Found</h2>
          <p className="text-muted-foreground">{orderResult.error}</p>
          <Button asChild className="mt-4">
            <Link href="/admin/orders">Back to Orders</Link>
          </Button>
        </div>
      </div>
    );
  }

  const order = orderResult.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Order {order.orderNumber}</h1>
          <p className="text-muted-foreground">
            Placed on {new Date(order.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Order Details */}
        <div className="lg:col-span-2 space-y-6">
          <OrderDetails order={order} />
        </div>

        {/* Right Column - Actions & Timeline */}
        <div className="space-y-6">
          <Suspense fallback={<div>Loading...</div>}>
            <OrderActions order={order} userRole={session.user.role} />
          </Suspense>
          
          <OrderTimeline order={order} />
        </div>
      </div>
    </div>
  );
}
