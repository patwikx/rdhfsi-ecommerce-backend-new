import { getCategoryById, getParentCategories } from '@/app/actions/category-actions';
import { CategoryForm } from '@/components/admin/categories/category-form';
import { CategoryProducts } from '@/components/admin/categories/category-products';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Package } from 'lucide-react';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export default async function EditCategoryPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    redirect('/admin/categories');
  }

  const [categoryResult, parentCategoriesResult] = await Promise.all([
    getCategoryById(id),
    getParentCategories(),
  ]);

  const productsData = await prisma.product.findMany({
    where: { categoryId: id },
    select: {
      id: true,
      sku: true,
      name: true,
      retailPrice: true,
      isActive: true,
      images: {
        select: {
          url: true,
        },
        orderBy: {
          sortOrder: 'asc',
        },
        take: 1,
      },
      inventories: {
        select: {
          id: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  // Convert Decimal to number for client component
  const products = productsData.map(product => ({
    ...product,
    retailPrice: Number(product.retailPrice),
  }));

  if (!categoryResult.success || !categoryResult.data) {
    notFound();
  }

  const parentCategories = parentCategoriesResult.success 
    ? (parentCategoriesResult.data || []).filter(c => c.id !== id)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/categories">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">{categoryResult.data.name}</h1>
          <p className="text-muted-foreground">Update category information and manage products</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={categoryResult.data.isActive ? 'default' : 'secondary'}>
            {categoryResult.data.isActive ? 'Active' : 'Inactive'}
          </Badge>
          {categoryResult.data.isFeatured && <Badge variant="outline">Featured</Badge>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <CategoryForm category={categoryResult.data} parentCategories={parentCategories} />
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Products ({products.length})</h2>
            </div>
            <Button asChild size="sm">
              <Link href={`/admin/products/create?categoryId=${id}`}>
                Add Product
              </Link>
            </Button>
          </div>
          <CategoryProducts products={products} />
        </div>
      </div>
    </div>
  );
}
