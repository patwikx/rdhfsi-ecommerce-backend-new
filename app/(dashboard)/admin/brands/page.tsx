import { getAllBrands } from '@/app/actions/brand-actions';
import { BrandList } from '@/components/admin/brands/brand-list';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export default async function BrandsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  const brandsResult = await getAllBrands();

  if (!brandsResult.success) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">Error Loading Brands</h2>
          <p className="text-muted-foreground">{brandsResult.error}</p>
        </div>
      </div>
    );
  }

  const brands = brandsResult.data || [];

  // Calculate stats
  const activeCount = brands.filter(b => b.isActive).length;
  const featuredCount = brands.filter(b => b.isFeatured).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Brands</h1>
          <p className="text-muted-foreground">
            Manage product brands and manufacturers
          </p>
        </div>
        {['ADMIN', 'MANAGER'].includes(session.user.role) && (
          <Button asChild>
            <Link href="/admin/brands/create">
              <Plus className="h-4 w-4 mr-2" />
              Add Brand
            </Link>
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Plus className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-muted-foreground">Total Brands</p>
          </div>
          <p className="text-2xl font-bold">{brands.length}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Plus className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-muted-foreground">Active</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Plus className="h-4 w-4 text-yellow-600" />
            <p className="text-sm font-medium text-muted-foreground">Featured</p>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{featuredCount}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Plus className="h-4 w-4 text-gray-600" />
            <p className="text-sm font-medium text-muted-foreground">Inactive</p>
          </div>
          <p className="text-2xl font-bold text-gray-600">{brands.length - activeCount}</p>
        </div>
      </div>

      <BrandList brands={brands} userRole={session.user.role} />
    </div>
  );
}
