import { Suspense } from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getAllBanners } from '@/app/actions/banner-actions';
import { BannerList } from '@/components/admin/marketing/banner-list';
import { Button } from '@/components/ui/button';
import { Plus, Image } from 'lucide-react';
import Link from 'next/link';

export default async function BannersPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  const result = await getAllBanners();
  const banners = result.success && result.data ? result.data : [];

  // Calculate stats
  const activeCount = banners.filter(b => {
    if (!b.isActive) return false;
    if (!b.startDate || !b.endDate) return true;
    const now = new Date();
    return new Date(b.startDate) <= now && new Date(b.endDate) >= now;
  }).length;
  const scheduledCount = banners.filter(b => {
    if (!b.startDate) return false;
    return new Date(b.startDate) > new Date();
  }).length;
  const expiredCount = banners.filter(b => {
    if (!b.endDate) return false;
    return new Date(b.endDate) < new Date();
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hero Banners</h1>
          <p className="text-muted-foreground">
            Manage promotional banners for your store
          </p>
        </div>
        <Link href="/admin/marketing/banners/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Banner
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Image className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-muted-foreground">Total Banners</p>
          </div>
          <p className="text-2xl font-bold">{banners.length}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Image className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-muted-foreground">Active</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Image className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-muted-foreground">Scheduled</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">{scheduledCount}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Image className="h-4 w-4 text-red-600" />
            <p className="text-sm font-medium text-muted-foreground">Expired</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{expiredCount}</p>
        </div>
      </div>

      {/* Banner List */}
      <Suspense fallback={<div>Loading...</div>}>
        <BannerList banners={banners} userRole={session.user.role} />
      </Suspense>
    </div>
  );
}
