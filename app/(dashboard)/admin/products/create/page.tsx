import { ProductForm } from '@/components/admin/products/product-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export default async function CreateProductPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    redirect('/admin/products');
  }

  const [categories, brands] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.brand.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/products">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">Create Product</h1>
          <p className="text-muted-foreground">Add a new product to your catalog</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/products">Cancel</Link>
          </Button>
          <Button type="submit" form="product-form" size="sm">
            Create Product
          </Button>
        </div>
      </div>

      <ProductForm categories={categories} brands={brands} />
    </div>
  );
}
