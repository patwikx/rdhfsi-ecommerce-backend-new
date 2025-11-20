import { Suspense } from 'react';
import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import {
  getCustomerById,
  getCustomerOrders,
  getCustomerStats,
  getCustomerActivity,
} from '@/app/actions/customer-actions';
import { CustomerTabs } from '@/components/admin/customers/customer-tabs';
import { Button } from '@/components/ui/button';

import { ArrowLeft, TrendingUp, ShoppingCart, Calendar } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default async function CustomerDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  const { id } = await params;

  const [customerResult, ordersResult, statsResult, activityResult] = await Promise.all([
    getCustomerById(id),
    getCustomerOrders(id),
    getCustomerStats(id),
    getCustomerActivity(id),
  ]);

  if (!customerResult.success || !customerResult.data) {
    notFound();
  }

  const customer = customerResult.data;
  const orders = ordersResult.success && ordersResult.data ? ordersResult.data : [];
  const stats = statsResult.success && statsResult.data ? statsResult.data : null;
  const activities = activityResult.success && activityResult.data ? activityResult.data : [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/customers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Customer Details
            </h1>
            <p className="text-muted-foreground">
              View and manage customer information
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Orders</div>
                <div className="text-2xl font-bold">{stats.totalOrders}</div>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Lifetime Value</div>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.totalSpent)}
                </div>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Last Order</div>
                <div className="text-lg font-bold">
                  {stats.lastOrderDate
                    ? format(new Date(stats.lastOrderDate), 'MMM dd, yyyy')
                    : 'Never'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Suspense fallback={<div>Loading...</div>}>
        <CustomerTabs
          customer={customer}
          orders={orders}
          activities={activities}
          userRole={session.user.role}
        />
      </Suspense>
    </div>
  );
}
