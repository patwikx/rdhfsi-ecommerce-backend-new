'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateInventorySettings } from '@/app/actions/inventory-actions';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Inventory = {
  id: string;
  minStockLevel: number | null;
  maxStockLevel: number | null;
  reorderPoint: number | null;
  product: {
    name: string;
    sku: string;
    baseUom: string;
  };
  site: {
    name: string;
  };
};

type InventorySettingsModalProps = {
  open: boolean;
  onClose: () => void;
  inventory: Inventory;
};

export function InventorySettingsModal({ open, onClose, inventory }: InventorySettingsModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [minStockLevel, setMinStockLevel] = useState(inventory.minStockLevel?.toString() || '');
  const [maxStockLevel, setMaxStockLevel] = useState(inventory.maxStockLevel?.toString() || '');
  const [reorderPoint, setReorderPoint] = useState(inventory.reorderPoint?.toString() || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await updateInventorySettings(inventory.id, {
        minStockLevel: minStockLevel ? Number(minStockLevel) : null,
        maxStockLevel: maxStockLevel ? Number(maxStockLevel) : null,
        reorderPoint: reorderPoint ? Number(reorderPoint) : null,
      });

      if (result.success) {
        toast.success('Settings updated successfully');
        router.refresh();
        onClose();
      } else {
        toast.error(result.error || 'Failed to update settings');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Inventory Settings</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="border rounded-lg p-3 bg-muted/50 space-y-1">
            <p className="font-semibold">{inventory.product.name}</p>
            <p className="text-sm text-muted-foreground">SKU: {inventory.product.sku}</p>
            <p className="text-sm text-muted-foreground">Site: {inventory.site.name}</p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="minStockLevel">Minimum Stock Level</Label>
            <Input
              id="minStockLevel"
              type="number"
              step="0.01"
              value={minStockLevel}
              onChange={(e) => setMinStockLevel(e.target.value)}
              placeholder="e.g., 10"
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">
              Alert when stock falls below this level
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="maxStockLevel">Maximum Stock Level</Label>
            <Input
              id="maxStockLevel"
              type="number"
              step="0.01"
              value={maxStockLevel}
              onChange={(e) => setMaxStockLevel(e.target.value)}
              placeholder="e.g., 1000"
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">
              Maximum capacity for this location
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="reorderPoint">Reorder Point</Label>
            <Input
              id="reorderPoint"
              type="number"
              step="0.01"
              value={reorderPoint}
              onChange={(e) => setReorderPoint(e.target.value)}
              placeholder="e.g., 20"
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">
              Trigger automatic reorder at this level
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Settings
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
