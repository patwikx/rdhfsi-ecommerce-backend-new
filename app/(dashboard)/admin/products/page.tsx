import { getAllProducts } from '@/app/actions/product-actions';
import { ProductList } from '@/components/admin/products/product-list';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export default async function ProductsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  const productsResult = await getAllProducts();

  if (!productsResult.success) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">Error Loading Products</h2>
          <p className="text-muted-foreground">{productsResult.error}</p>
        </div>
      </div>
    );
  }

  const products = productsResult.data || [];

  // Calculate stats
  const activeCount = products.filter(p => p.isActive).length;
  const featuredCount = products.filter(p => p.isFeatured).length;
  const inactiveCount = products.filter(p => !p.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground">
            Manage your product catalog
          </p>
        </div>
        {['ADMIN', 'MANAGER'].includes(session.user.role) && (
          <Button asChild>
            <Link href="/admin/products/create">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Link>
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Plus className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-muted-foreground">Total Products</p>
          </div>
          <p className="text-2xl font-bold">{products.length}</p>
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
          <p className="text-2xl font-bold text-gray-600">{inactiveCount}</p>
        </div>
      </div>

      <ProductList products={products} userRole={session.user.role} />
    </div>
  );
}
