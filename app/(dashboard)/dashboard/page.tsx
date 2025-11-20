import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getDashboardStats } from '@/app/actions/dashboard-actions';
import { DashboardStats } from '@/components/dashboard/dashboard-stats';
import { SalesChart } from '@/components/dashboard/sales-chart';
import { RecentOrders } from '@/components/dashboard/recent-orders';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  const isAdmin = ['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role);

  if (!isAdmin) {
    redirect('/products'); // Redirect customers to products page
  }

  // Fetch dashboard stats
  const statsResult = await getDashboardStats();

  const stats = statsResult.success && statsResult.data ? statsResult.data : {
    totalRevenue: 0,
    revenueChange: 0,
    totalOrders: 0,
    ordersChange: 0,
    totalCustomers: 0,
    customersChange: 0,
    averageOrderValue: 0,
    aovChange: 0,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <DashboardStats stats={stats} />

      {/* Sales Chart */}
      <SalesChart />

      {/* Recent Orders Table */}
      <RecentOrders />
    </div>
  );
}
