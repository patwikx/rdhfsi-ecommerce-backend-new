import { getBrandById } from '@/app/actions/brand-actions';
import { BrandForm } from '@/components/admin/brands/brand-form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Package } from 'lucide-react';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Image from 'next/image';

export default async function EditBrandPage({ 
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
    redirect('/admin/brands');
  }

  const [brandResult, productsData] = await Promise.all([
    getBrandById(id),
    prisma.product.findMany({
      where: { brandId: id },
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
      },
      orderBy: { name: 'asc' },
      take: 10,
    }),
  ]);

  if (!brandResult.success || !brandResult.data) {
    notFound();
  }

  const products = productsData.map(product => ({
    ...product,
    retailPrice: Number(product.retailPrice),
  }));

  const totalProducts = await prisma.product.count({
    where: { brandId: id },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/brands">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 flex items-center gap-4">
          {brandResult.data.logo && (
            <div className="relative h-12 w-12 rounded overflow-hidden bg-muted flex-shrink-0">
              <Image
                src={brandResult.data.logo}
                alt={brandResult.data.name}
                fill
                className="object-contain"
              />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-foreground">{brandResult.data.name}</h1>
            <p className="text-muted-foreground">Update brand information and manage products</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={brandResult.data.isActive ? 'default' : 'secondary'}>
            {brandResult.data.isActive ? 'Active' : 'Inactive'}
          </Badge>
          {brandResult.data.isFeatured && <Badge variant="outline">Featured</Badge>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <BrandForm brand={brandResult.data} />
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Products ({totalProducts})</h2>
            </div>
            <Button asChild size="sm">
              <Link href={`/admin/products/create?brandId=${id}`}>
                Add Product
              </Link>
            </Button>
          </div>

          {products.length === 0 ? (
            <div className="border rounded-lg p-8 text-center">
              <p className="text-muted-foreground">No products for this brand yet</p>
            </div>
          ) : (
            <div className="border rounded-lg divide-y">
              {products.map((product) => (
                <div key={product.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex gap-3 items-center">
                    <div className="relative h-12 w-12 rounded bg-muted flex-shrink-0 overflow-hidden">
                      {product.images[0]?.url ? (
                        <Image
                          src={product.images[0].url}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{product.name}</h4>
                      <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        ${product.retailPrice.toFixed(2)}
                      </span>
                      <Badge variant={product.isActive ? 'default' : 'secondary'} className="text-xs">
                        {product.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
              {totalProducts > 10 && (
                <div className="p-4 text-center">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/products?brandId=${id}`}>
                      View All {totalProducts} Products
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
