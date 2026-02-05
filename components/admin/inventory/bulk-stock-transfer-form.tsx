'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, ArrowRight, Search, Package } from 'lucide-react';
import { transferStock } from '@/app/actions/inventory-actions';
import { useSite } from '@/components/context/site-context';

type Site = {
  id: string;
  code: string;
  name: string;
};

type InventoryItem = {
  id: string;
  quantity: number;
  reservedQty: number;
  availableQty: number;
  productId: string;
  siteId: string;
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

type SelectedItem = {
  inventoryId: string;
  productId: string;
  productName: string;
  sku: string;
  baseUom: string;
  availableQty: number;
  transferQty: number;
};

type BulkStockTransferFormProps = {
  sites: Site[];
  inventory: InventoryItem[];
};

export function BulkStockTransferForm({ sites, inventory }: BulkStockTransferFormProps) {
  const router = useRouter();
  const { siteId: sourceSiteId } = useSite();
  const [isLoading, setIsLoading] = useState(false);
  const [destSiteId, setDestSiteId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItem>>(new Map());
  const [notes, setNotes] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Get current site info
  const currentSite = sites.find(s => s.id === sourceSiteId);

  // Filter inventory by source site
  const filteredInventory = useMemo(() => {
    let items = inventory;

    if (sourceSiteId) {
      items = items.filter(inv => inv.siteId === sourceSiteId);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      items = items.filter(inv =>
        inv.product.name.toLowerCase().includes(search) ||
        inv.product.sku.toLowerCase().includes(search)
      );
    }

    return items;
  }, [inventory, sourceSiteId, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInventory = filteredInventory.slice(startIndex, endIndex);

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [sourceSiteId, searchTerm]);

  const handleSelectItem = (inv: InventoryItem, checked: boolean) => {
    const newSelected = new Map(selectedItems);
    
    if (checked) {
      newSelected.set(inv.id, {
        inventoryId: inv.id,
        productId: inv.productId,
        productName: inv.product.name,
        sku: inv.product.sku,
        baseUom: inv.product.baseUom,
        availableQty: inv.availableQty,
        transferQty: 1,
      });
    } else {
      newSelected.delete(inv.id);
    }
    
    setSelectedItems(newSelected);
  };

  const handleQuantityChange = (inventoryId: string, qty: number) => {
    const newSelected = new Map(selectedItems);
    const item = newSelected.get(inventoryId);
    
    if (item) {
      item.transferQty = Math.max(0, Math.min(qty, item.availableQty));
      newSelected.set(inventoryId, item);
      setSelectedItems(newSelected);
    }
  };

  const handleSubmit = async () => {
    if (!sourceSiteId || !destSiteId) {
      toast.error('Please select both source and destination sites');
      return;
    }

    if (sourceSiteId === destSiteId) {
      toast.error('Source and destination sites must be different');
      return;
    }

    if (selectedItems.size === 0) {
      toast.error('Please select at least one item to transfer');
      return;
    }

    // Validate quantities
    const invalidItems = Array.from(selectedItems.values()).filter(
      item => item.transferQty <= 0 || item.transferQty > item.availableQty
    );

    if (invalidItems.length > 0) {
      toast.error('Please check transfer quantities');
      return;
    }

    setIsLoading(true);

    try {
      // Process transfers sequentially
      const transfers = Array.from(selectedItems.values());
      
      for (const item of transfers) {
        const result = await transferStock({
          productId: item.productId,
          fromSiteId: sourceSiteId,
          toSiteId: destSiteId,
          quantity: item.transferQty,
          notes: notes || undefined,
        });

        if (!result.success) {
          throw new Error(`Failed to transfer ${item.productName}: ${result.error}`);
        }
      }

      toast.success(`Successfully transferred ${transfers.length} item(s)`);

      // Reset form
      setSelectedItems(new Map());
      setDestSiteId('');
      setNotes('');
      setSearchTerm('');

      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process transfers');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Selection & Table */}
      <div className="lg:col-span-2 space-y-4">
        {/* Current Site Display & Destination Selection */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Source Site</Label>
            <div className="flex items-center h-10 px-3 py-2 border rounded-md bg-muted">
              <span className="font-medium">
                {currentSite ? `${currentSite.name} (${currentSite.code})` : 'No site selected'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Use site switcher to change source site
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="destSite">Destination Site *</Label>
            <Select value={destSiteId} onValueChange={setDestSiteId}>
              <SelectTrigger id="destSite">
                <SelectValue placeholder="Select destination site" />
              </SelectTrigger>
              <SelectContent>
                {sites
                  .filter(site => site.id !== sourceSiteId)
                  .map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name} ({site.code})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Transfer Preview */}
        {sourceSiteId && destSiteId && (
          <div className="flex items-center justify-center gap-4 p-3 bg-muted rounded-lg">
            <div className="text-center">
              <div className="font-semibold text-sm">{currentSite?.name}</div>
              <div className="text-xs text-muted-foreground">Source</div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <div className="text-center">
              <div className="font-semibold text-sm">{sites.find(s => s.id === destSiteId)?.name}</div>
              <div className="text-xs text-muted-foreground">Destination</div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            disabled={!sourceSiteId}
          />
        </div>

        {/* Inventory Table - Fixed Height with Scroll */}
        <div className="border rounded-lg">
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="w-32">Transfer Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!sourceSiteId ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                      <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Please select a source site to view inventory</p>
                    </TableCell>
                  </TableRow>
                ) : filteredInventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                      <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No inventory available at this site</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedInventory.map((inv) => {
                    const isSelected = selectedItems.has(inv.id);
                    const selectedItem = selectedItems.get(inv.id);

                    return (
                      <TableRow
                        key={inv.id}
                        className={`cursor-pointer ${isSelected ? 'bg-muted/50' : ''}`}
                        onClick={() => handleSelectItem(inv, !isSelected)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectItem(inv, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{inv.product.name}</div>
                            <div className="text-sm text-muted-foreground font-mono">{inv.product.sku}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{inv.product.category.name}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {inv.availableQty} {inv.product.baseUom}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {isSelected && (
                            <Input
                              type="number"
                              min="1"
                              max={inv.availableQty}
                              value={selectedItem?.transferQty || 1}
                              onChange={(e) => handleQuantityChange(inv.id, parseFloat(e.target.value))}
                              className="w-24"
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {sourceSiteId && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
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
      </div>

      {/* Right Column - Summary & Actions */}
      <div className="space-y-4">
        {/* Selected Items Summary */}
        <div className="border rounded-lg p-4">
          <div className="font-semibold mb-3">Selected Items ({selectedItems.size})</div>
          {selectedItems.size === 0 ? (
            <p className="text-sm text-muted-foreground">No items selected</p>
          ) : (
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {Array.from(selectedItems.values()).map((item) => (
                <div key={item.inventoryId} className="text-sm border-b pb-2 last:border-0">
                  <div className="font-medium truncate">{item.productName}</div>
                  <div className="flex justify-between text-muted-foreground">
                    <span className="text-xs font-mono">{item.sku}</span>
                    <span className="font-semibold text-foreground">{item.transferQty} {item.baseUom}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Transfer Notes</Label>
          <Input
            id="notes"
            placeholder="Reference number (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button
            onClick={handleSubmit}
            disabled={isLoading || selectedItems.size === 0 || !sourceSiteId || !destSiteId}
            className="w-full"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Transfer {selectedItems.size > 0 && `(${selectedItems.size})`}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSelectedItems(new Map());
              setDestSiteId('');
              setNotes('');
              setSearchTerm('');
            }}
            className="w-full"
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
