import { Suspense } from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getAllDiscountTypes } from '@/app/actions/discount-actions';
import { DiscountList } from '@/components/admin/marketing/discount-list';
import { Button } from '@/components/ui/button';
import { Plus, Tag } from 'lucide-react';
import Link from 'next/link';

export default async function DiscountsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  const result = await getAllDiscountTypes();
  const discounts = result.success && result.data ? result.data : [];

  // Calculate stats
  const activeCount = discounts.filter(d => d.isActive).length;
  const requiresVerificationCount = discounts.filter(d => d.requiresVerification).length;
  const expiredCount = discounts.filter(d => {
    if (!d.validUntil) return false;
    return new Date(d.validUntil) < new Date();
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discount Types</h1>
          <p className="text-muted-foreground">
            Manage discount types like Senior Citizen, PWD, Employee discounts
          </p>
        </div>
        <Link href="/admin/marketing/discounts/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Discount
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-muted-foreground">Total Discounts</p>
          </div>
          <p className="text-2xl font-bold">{discounts.length}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-muted-foreground">Active</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-4 w-4 text-purple-600" />
            <p className="text-sm font-medium text-muted-foreground">Requires Verification</p>
          </div>
          <p className="text-2xl font-bold text-purple-600">{requiresVerificationCount}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-4 w-4 text-red-600" />
            <p className="text-sm font-medium text-muted-foreground">Expired</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{expiredCount}</p>
        </div>
      </div>

      {/* Discount List */}
      <Suspense fallback={<div>Loading...</div>}>
        <DiscountList discounts={discounts} userRole={session.user.role} />
      </Suspense>
    </div>
  );
}
