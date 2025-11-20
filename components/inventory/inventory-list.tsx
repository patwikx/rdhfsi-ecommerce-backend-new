'use client';

import { useEffect, useState } from 'react';
import { useCurrentSite } from '@/hooks/use-current-site';
import { getAllInventory } from '@/app/actions/inventory-actions';
import { Loader2, Package, AlertTriangle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type InventoryItem = any; // Using any for now due to Prisma Decimal types

export function InventoryList() {
  const { siteId, isLoading: isSiteLoading } = useCurrentSite();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInventory() {
      if (!siteId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await getAllInventory({ siteId });
        
        if (result.success && result.data) {
          setInventory(result.data as InventoryItem[]);
        } else {
          setError(result.error || 'Failed to fetch inventory');
        }
      } catch (err) {
        setError('An error occurred while fetching inventory');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchInventory();
  }, [siteId]); // Re-fetch when site changes

  if (isSiteLoading || isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-destructive">
        <AlertTriangle className="h-5 w-5 mr-2" />
        {error}
      </div>
    );
  }

  if (!siteId) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <Package className="h-5 w-5 mr-2" />
        Please select a site to view inventory
      </div>
    );
  }

  if (inventory.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <Package className="h-5 w-5 mr-2" />
        No inventory items found for this site
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Inventory</h2>
        <Badge variant="outline">
          {inventory[0]?.site.name} ({inventory[0]?.site.code})
        </Badge>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead className="text-right">On Hand</TableHead>
              <TableHead className="text-right">Reserved</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead className="text-right">Min Level</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.map((item) => {
              const isLowStock = item.minStockLevel 
                ? Number(item.availableQty) <= Number(item.minStockLevel)
                : false;

              return (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">
                    {item.product.sku}
                  </TableCell>
                  <TableCell className="font-medium">
                    {item.product.name}
                  </TableCell>
                  <TableCell>
                    {item.product.category?.name || '-'}
                  </TableCell>
                  <TableCell>
                    {item.product.brand?.name || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(item.quantity).toFixed(2)} {item.product.baseUom}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(item.reservedQty).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {Number(item.availableQty).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.minStockLevel ? Number(item.minStockLevel).toFixed(2) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    ₱{Number(item.product.retailPrice).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {isLowStock ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Low Stock
                      </Badge>
                    ) : Number(item.availableQty) > 0 ? (
                      <Badge variant="default">In Stock</Badge>
                    ) : (
                      <Badge variant="secondary">Out of Stock</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
