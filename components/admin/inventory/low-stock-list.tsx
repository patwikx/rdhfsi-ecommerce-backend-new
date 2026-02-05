'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, Package, TrendingDown, ArrowRight } from 'lucide-react';
import Link from 'next/link';

type LowStockItem = {
  id: string;
  quantity: number;
  reservedQty: number;
  availableQty: number;
  minStockLevel: number | null;
  reorderPoint: number | null;
  product: {
    id: string;
    sku: string;
    name: string;
    baseUom: string;
    category: {
      name: string;
    };
  };
  site: {
    id: string;
    code: string;
    name: string;
  };
};

type Site = {
  id: string;
  code: string;
  name: string;
};

type LowStockListProps = {
  inventory: LowStockItem[];
  sites: Site[];
  userRole: string;
  currentFilters: {
    siteId?: string;
    critical?: boolean;
  };
};

export function LowStockList({ inventory, sites, userRole, currentFilters }: LowStockListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Filter for critical items
  const filteredInventory = currentFilters.critical
    ? inventory.filter(
        (inv) => inv.minStockLevel && inv.availableQty <= inv.minStockLevel * 0.5
      )
    : inventory;

  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInventory = filteredInventory.slice(startIndex, endIndex);

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setCurrentPage(1);
    router.push(`/admin/inventory/low-stock?${params.toString()}`);
  };

  const getStockPercentage = (inv: LowStockItem) => {
    if (!inv.minStockLevel) return 0;
    return (inv.availableQty / inv.minStockLevel) * 100;
  };

  const isCritical = (inv: LowStockItem) => {
    return inv.minStockLevel && inv.availableQty <= inv.minStockLevel * 0.5;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3">
        <Select
          value={currentFilters.siteId || 'all'}
          onValueChange={(value) => updateFilters('siteId', value === 'all' ? '' : value)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Sites" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sites</SelectItem>
            {sites.map((site) => (
              <SelectItem key={site.id} value={site.id}>
                {site.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={currentFilters.critical ? 'destructive' : 'outline'}
          onClick={() => updateFilters('critical', currentFilters.critical ? '' : 'true')}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Critical Only
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Site</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead className="text-right">Min Level</TableHead>
              <TableHead className="text-right">Reorder Point</TableHead>
              <TableHead>Stock Level</TableHead>
              <TableHead>Priority</TableHead>
              {['ADMIN', 'MANAGER'].includes(userRole) && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedInventory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No low stock items found</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedInventory.map((inv) => {
                const percentage = getStockPercentage(inv);
                const critical = isCritical(inv);

                return (
                  <TableRow key={inv.id} className={critical ? 'bg-red-50' : ''}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{inv.product.name}</div>
                        <div className="text-sm text-muted-foreground font-mono">{inv.product.sku}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{inv.product.category.name}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{inv.site.code}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={critical ? 'font-bold text-red-600' : 'font-semibold'}>
                        {inv.availableQty} {inv.product.baseUom}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {inv.minStockLevel !== null ? `${inv.minStockLevel} ${inv.product.baseUom}` : '-'}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {inv.reorderPoint !== null ? `${inv.reorderPoint} ${inv.product.baseUom}` : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              critical ? 'bg-red-600' : percentage < 75 ? 'bg-yellow-600' : 'bg-green-600'
                            }`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">{percentage.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {critical ? (
                        <Badge variant="destructive" className="gap-1">
                          <TrendingDown className="h-3 w-3" />
                          Critical
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Low
                        </Badge>
                      )}
                    </TableCell>
                    {['ADMIN', 'MANAGER'].includes(userRole) && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <Link href={`/admin/inventory/adjust?inventoryId=${inv.id}`}>
                              <Package className="h-4 w-4 mr-1" />
                              Adjust
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredInventory.length)} of {filteredInventory.length} items
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              <Button
                variant={currentPage === 1 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPage(1)}
                className="w-9"
              >
                1
              </Button>

              {currentPage > 3 && (
                <span className="px-2 text-muted-foreground">...</span>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  if (page === 1 || page === totalPages) return false;
                  return Math.abs(page - currentPage) <= 1;
                })
                .map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-9"
                  >
                    {page}
                  </Button>
                ))}

              {currentPage < totalPages - 2 && (
                <span className="px-2 text-muted-foreground">...</span>
              )}

              {totalPages > 1 && (
                <Button
                  variant={currentPage === totalPages ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  className="w-9"
                >
                  {totalPages}
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
