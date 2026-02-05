import { getProductById } from '@/app/actions/product-actions';
import { ProductForm } from '@/components/admin/products/product-form';
import { ProductQRCode } from '@/components/admin/products/product-qr-code';
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
      orderBy: { name: 'desc' },
    }),
    prisma.brand.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'desc' },
    }),
  ]);

  if (!productResult.success || !productResult.data) {
    notFound();
  }

  const product = productResult.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">

        {/* QR Code on the left */}
        <ProductQRCode product={product} />
        
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

      {/* Pricing Overview */}
      <div className="border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Pricing Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Retail Price (SRP)</p>
            <p className="text-xl font-bold">
              ₱{Number(product.retailPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          {product.wholesalePrice && (
            <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950">
              <p className="text-sm text-muted-foreground mb-1">Wholesale Price</p>
              <p className="text-xl font-bold text-blue-600">
                ₱{Number(product.wholesalePrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          )}
          {product.poPrice && (
            <div className="border rounded-lg p-4 bg-purple-50 dark:bg-purple-950">
              <p className="text-sm text-muted-foreground mb-1">PO Price</p>
              <p className="text-xl font-bold text-purple-600">
                ₱{Number(product.poPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          )}
          {product.costPrice && (
            <div className="border rounded-lg p-4 bg-orange-50 dark:bg-orange-950">
              <p className="text-sm text-muted-foreground mb-1">Cost Price</p>
              <p className="text-xl font-bold text-orange-600">
                ₱{Number(product.costPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </div>
      </div>

      <ProductForm product={product} categories={categories} brands={brands} />
    </div>
  );
}
