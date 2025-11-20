'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, ImageIcon } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

type Product = {
  id: string;
  sku: string;
  name: string;
  retailPrice: number;
  isActive: boolean;
  images: { url: string }[];
  inventories: { id: string }[];
};

type CategoryProductsProps = {
  products: Product[];
};

export function CategoryProducts({ products }: CategoryProductsProps) {
  const router = useRouter();

  if (products.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">No products in this category yet</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg divide-y max-h-[600px] overflow-y-auto">
      {products.map((product) => (
        <div key={product.id} className="p-4 hover:bg-muted/50 transition-colors">
          <div className="flex gap-4">
            <div className="relative h-16 w-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
              {product.images[0]?.url ? (
                <Image
                  src={product.images[0].url}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{product.name}</h4>
                  <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="flex-shrink-0"
                >
                  <Link href={`/admin/products/${product.id}`}>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm font-semibold">
                  ${Number(product.retailPrice).toFixed(2)}
                </span>
                <Badge variant={product.isActive ? 'default' : 'secondary'} className="text-xs">
                  {product.isActive ? 'Active' : 'Inactive'}
                </Badge>
                {product.inventories.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {product.inventories.length} location{product.inventories.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
