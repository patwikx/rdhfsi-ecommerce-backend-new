'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, AlertTriangle, Settings, History, Package } from 'lucide-react';
import { InventorySettingsModal } from './inventory-settings-modal';
import { MovementHistoryModal } from './movement-history-modal';
import Link from 'next/link';

type Inventory = {
  id: string;
  quantity: number;
  reservedQty: number;
  availableQty: number;
  minStockLevel: number | null;
  maxStockLevel: number | null;
  reorderPoint: number | null;
  product: {
    id: string;
    sku: string;
    name: string;
    baseUom: string;
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

type InventoryListProps = {
  inventory: Inventory[];
  sites: Site[];
  userRole: string;
  currentFilters: {
    siteId?: string;
    lowStock?: boolean;
    search?: string;
  };
};

export function InventoryList({ inventory, sites, userRole, currentFilters }: InventoryListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(currentFilters.search || '');
  const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const totalPages = Math.ceil(inventory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInventory = inventory.slice(startIndex, endIndex);

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setCurrentPage(1);
    router.push(`/admin/inventory?${params.toString()}`);
  };

  const handleSearch = () => {
    updateFilters('search', searchTerm);
  };

  const isLowStock = (inv: Inventory) => {
    return inv.minStockLevel !== null && inv.availableQty <= inv.minStockLevel;
  };

  const openSettingsModal = (inv: Inventory) => {
    setSelectedInventory(inv);
    setSettingsModalOpen(true);
  };

  const openHistoryModal = (inv: Inventory) => {
    setSelectedInventory(inv);
    setHistoryModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by product name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9"
          />
        </div>
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
          variant={currentFilters.lowStock ? 'default' : 'outline'}
          onClick={() => updateFilters('lowStock', currentFilters.lowStock ? '' : 'true')}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Low Stock
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Site</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Reserved</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead className="text-right">Min Level</TableHead>
              <TableHead>Status</TableHead>
              {['ADMIN', 'MANAGER'].includes(userRole) && <TableHead className="w-[140px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  No inventory found
                </TableCell>
              </TableRow>
            ) : (
              paginatedInventory.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.product.name}</TableCell>
                  <TableCell className="font-mono text-sm">{inv.product.sku}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{inv.site.code}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {inv.quantity} {inv.product.baseUom}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {inv.reservedQty} {inv.product.baseUom}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {inv.availableQty} {inv.product.baseUom}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {inv.minStockLevel !== null ? `${inv.minStockLevel} ${inv.product.baseUom}` : '-'}
                  </TableCell>
                  <TableCell>
                    {isLowStock(inv) ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Low Stock
                      </Badge>
                    ) : (
                      <Badge variant="default">In Stock</Badge>
                    )}
                  </TableCell>
                  {['ADMIN', 'MANAGER'].includes(userRole) && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          asChild
                          title="Adjust Stock"
                        >
                          <Link href={`/admin/inventory/adjust?inventoryId=${inv.id}`}>
                            <Package className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openSettingsModal(inv)}
                          title="Settings"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openHistoryModal(inv)}
                          title="History"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, inventory.length)} of {inventory.length} items
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
              {/* First page */}
              <Button
                variant={currentPage === 1 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPage(1)}
                className="w-9"
              >
                1
              </Button>

              {/* Left ellipsis */}
              {currentPage > 3 && (
                <span className="px-2 text-muted-foreground">...</span>
              )}

              {/* Pages around current */}
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

              {/* Right ellipsis */}
              {currentPage < totalPages - 2 && (
                <span className="px-2 text-muted-foreground">...</span>
              )}

              {/* Last page */}
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

      {/* Modals */}
      {selectedInventory && (
        <>
          <InventorySettingsModal
            open={settingsModalOpen}
            onClose={() => {
              setSettingsModalOpen(false);
              setSelectedInventory(null);
            }}
            inventory={selectedInventory}
          />
          <MovementHistoryModal
            open={historyModalOpen}
            onClose={() => {
              setHistoryModalOpen(false);
              setSelectedInventory(null);
            }}
            inventory={selectedInventory}
          />
        </>
      )}
    </div>
  );
}
