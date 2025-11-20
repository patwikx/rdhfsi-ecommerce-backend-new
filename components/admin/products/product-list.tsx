'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, Power, Search } from 'lucide-react';
import { deleteProduct, toggleProductStatus } from '@/app/actions/product-actions';
import { toast } from 'sonner';
import Image from 'next/image';

type Product = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  retailPrice: number;
  isActive: boolean;
  isFeatured: boolean;
  category: { name: string };
  brand: { name: string } | null;
  images: { url: string; sortOrder: number }[];
  _count: { inventories: number };
};

type ProductListProps = {
  products: Product[];
  userRole: string;
};

export function ProductList({ products: initialProducts, userRole }: ProductListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = initialProducts.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleStatus = async (id: string) => {
    setLoading(id);
    const result = await toggleProductStatus(id);
    setLoading(null);

    if (result.success) {
      toast.success('Product status updated');
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to update status');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    setLoading(id);
    const result = await deleteProduct(id);
    setLoading(null);

    if (result.success) {
      toast.success('Product deleted');
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to delete product');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Image</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Stock</TableHead>
              {['ADMIN', 'MANAGER'].includes(userRole) && <TableHead className="w-[70px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.images[0]?.url ? (
                      <div className="relative h-10 w-10 rounded overflow-hidden bg-muted">
                        <Image
                          src={product.images[0].url}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        No Image
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {product.category.name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {product.brand?.name || '-'}
                  </TableCell>
                  <TableCell className="font-semibold">
                    ${Number(product.retailPrice).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Badge variant={product.isActive ? 'default' : 'secondary'}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {product.isFeatured && <Badge variant="outline">Featured</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {product._count.inventories > 0 ? (
                      <span className="text-sm">{product._count.inventories} sites</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">No stock</span>
                    )}
                  </TableCell>
                  {['ADMIN', 'MANAGER'].includes(userRole) && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={loading === product.id}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/admin/products/${product.id}`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(product.id)}>
                            <Power className="h-4 w-4 mr-2" />
                            {product.isActive ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          {userRole === 'ADMIN' && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(product.id, product.name)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
