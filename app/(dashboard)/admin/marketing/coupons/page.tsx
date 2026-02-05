import { Suspense } from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getAllCoupons } from '@/app/actions/coupon-actions';
import { CouponList } from '@/components/admin/marketing/coupon-list';
import { Button } from '@/components/ui/button';
import { Plus, Ticket } from 'lucide-react';
import Link from 'next/link';

export default async function CouponsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  const result = await getAllCoupons();
  const coupons = result.success && result.data ? result.data : [];

  // Calculate stats
  const activeCount = coupons.filter(c => {
    const now = new Date();
    return c.isActive && new Date(c.validFrom) <= now && new Date(c.validUntil) >= now;
  }).length;
  const expiredCount = coupons.filter(c => new Date(c.validUntil) < new Date()).length;
  const usedCount = coupons.filter(c => c.usageCount > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Coupons</h1>
          <p className="text-muted-foreground">
            Manage promotional coupon codes
          </p>
        </div>
        <Link href="/admin/marketing/coupons/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Coupon
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Ticket className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-muted-foreground">Total Coupons</p>
          </div>
          <p className="text-2xl font-bold">{coupons.length}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Ticket className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-muted-foreground">Active</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Ticket className="h-4 w-4 text-purple-600" />
            <p className="text-sm font-medium text-muted-foreground">Used</p>
          </div>
          <p className="text-2xl font-bold text-purple-600">{usedCount}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Ticket className="h-4 w-4 text-red-600" />
            <p className="text-sm font-medium text-muted-foreground">Expired</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{expiredCount}</p>
        </div>
      </div>

      {/* Coupon List */}
      <Suspense fallback={<div>Loading...</div>}>
        <CouponList coupons={coupons} userRole={session.user.role} />
      </Suspense>
    </div>
  );
}
