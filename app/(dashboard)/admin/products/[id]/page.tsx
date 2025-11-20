import { getProductById } from '@/app/actions/product-actions';
import { ProductForm } from '@/components/admin/products/product-form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export default async function EditProductPage({ 
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
    redirect('/admin/products');
  }

  const [productResult, categories, brands] = await Promise.all([
    getProductById(id),
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

  if (!productResult.success || !productResult.data) {
    notFound();
  }

  const product = productResult.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/products">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">{product.name}</h1>
          <p className="text-muted-foreground">SKU: {product.sku}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={product.isActive ? 'default' : 'secondary'}>
            {product.isActive ? 'Active' : 'Inactive'}
          </Badge>
          {product.isFeatured && <Badge variant="outline">Featured</Badge>}
          {product.isPublished && <Badge variant="outline">Published</Badge>}
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/products">Cancel</Link>
          </Button>
          <Button type="submit" form="product-form" size="sm">
            Update Product
          </Button>
        </div>
      </div>

      <ProductForm product={product} categories={categories} brands={brands} />
    </div>
  );
}
