'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  image: string | null;
  unitsSold: number;
  revenue: number;
  price: number;
};

interface TopProductsProps {
  initialProducts: Product[];
}

export function TopProducts({ initialProducts }: TopProductsProps) {
  const products = initialProducts;

  return (
    <Card className="p-6 bg-card border-border">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Top Products</h3>
            <p className="text-sm text-muted-foreground">Best selling products this month</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/products">View All</Link>
          </Button>
        </div>

        {/* Products List */}
        <div className="space-y-3">
          {products.length === 0 ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              <Package className="h-5 w-5 mr-2" />
              No product sales data
            </div>
          ) : (
            products.map((product, index) => (
              <div
                key={product.id}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors"
              >
                {/* Rank */}
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                  {index + 1}
                </div>

                {/* Product Image */}
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{product.name}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{product.sku}</span>
                    {product.category && (
                      <>
                        <span>•</span>
                        <span>{product.category}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right">
                  <div className="font-semibold text-sm">
                    {product.unitsSold} sold
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ₱{product.revenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Trending Badge */}
                <Badge variant="default" className="gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Hot
                </Badge>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}
