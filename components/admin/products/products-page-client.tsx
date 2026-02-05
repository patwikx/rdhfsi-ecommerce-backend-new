'use client';

import { useEffect, useState } from 'react';
import { ProductList } from '@/components/admin/products/product-list';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Download } from 'lucide-react';
import Link from 'next/link';
import { getAllProducts } from '@/app/actions/product-actions';
import { useCurrentSite } from '@/hooks/use-current-site';
import { toast } from 'sonner';

type Product = {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  slug: string;
  retailPrice: number;
  isActive: boolean;
  isFeatured: boolean;
  category: { name: string };
  brand: { name: string } | null;
  images: { url: string; sortOrder: number }[];
  qrCodeImage: string | null;
  _count: { inventories: number };
  inventory?: { quantity: number; availableQty: number } | null;
};

type ProductsPageClientProps = {
  userRole: string;
};

export function ProductsPageClient({ userRole }: ProductsPageClientProps) {
  const { siteId, isLoading: siteLoading } = useCurrentSite();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      if (!siteId) return;
      
      setIsLoading(true);
      const result = await getAllProducts({ siteId });
      
      if (result.success && result.data) {
        setProducts(result.data);
      } else {
        toast.error(result.error || 'Failed to load products');
      }
      setIsLoading(false);
    }

    loadProducts();
  }, [siteId]);

  // Calculate stats
  const activeCount = products.filter(p => p.isActive).length;
  const featuredCount = products.filter(p => p.isFeatured).length;
  const inactiveCount = products.filter(p => !p.isActive).length;

  const handleExportCSV = () => {
    try {
      // Create CSV header
      const headers = [
        'Barcode',
        'Name',
        'Category',
        'Brand',
        'Retail Price',
        'Status',
        'Featured',
        'Quantity',
        'Available Qty',
      ];

      // Create CSV rows
      const rows = products.map(product => [
        product.barcode,
        `"${product.name.replace(/"/g, '""')}"`, // Escape quotes
        product.category.name,
        product.brand?.name || '',
        product.retailPrice.toFixed(2),
        product.isActive ? 'Active' : 'Inactive',
        product.isFeatured ? 'Yes' : 'No',
        product.inventory?.quantity.toFixed(2) || '0.00',
        product.inventory?.availableQty.toFixed(2) || '0.00',
      ]);

      // Combine header and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `products-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${products.length} products to CSV`);
    } catch (error) {
      toast.error('Failed to export CSV');
      console.error('Export error:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground">
            Manage your product catalog
          </p>
        </div>
        {['ADMIN', 'MANAGER'].includes(userRole) && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV} disabled={products.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button asChild>
              <Link href="/admin/products/create">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Link>
            </Button>
          </div>
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

      <ProductList products={products} userRole={userRole} isLoading={isLoading} />
    </div>
  );
}
