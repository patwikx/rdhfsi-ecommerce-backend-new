import { getAllCategories } from '@/app/actions/category-actions';
import { CategoryList } from '@/components/admin/categories/category-list';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export default async function CategoriesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  const categoriesResult = await getAllCategories();

  if (!categoriesResult.success) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">Error Loading Categories</h2>
          <p className="text-muted-foreground">{categoriesResult.error}</p>
        </div>
      </div>
    );
  }

  const categories = categoriesResult.data || [];

  // Calculate stats
  const activeCount = categories.filter(c => c.isActive).length;
  const featuredCount = categories.filter(c => c.isFeatured).length;
  const parentCount = categories.filter(c => !c.parentId).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Categories</h1>
          <p className="text-muted-foreground">
            Manage product categories and subcategories
          </p>
        </div>
        {['ADMIN', 'MANAGER'].includes(session.user.role) && (
          <Button asChild>
            <Link href="/admin/categories/create">
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Link>
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Plus className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-muted-foreground">Total Categories</p>
          </div>
          <p className="text-2xl font-bold">{categories.length}</p>
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
            <Plus className="h-4 w-4 text-purple-600" />
            <p className="text-sm font-medium text-muted-foreground">Parent Categories</p>
          </div>
          <p className="text-2xl font-bold text-purple-600">{parentCount}</p>
        </div>
      </div>

      <CategoryList categories={categories} userRole={session.user.role} />
    </div>
  );
}
