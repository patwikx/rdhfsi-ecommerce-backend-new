'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adjustInventory } from '@/app/actions/inventory-actions';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Inventory = {
  id: string;
  quantity: number;
  reservedQty: number;
  availableQty: number;
  product: {
    name: string;
    sku: string;
    baseUom: string;
  };
  site: {
    name: string;
  };
};

type AdjustStockModalProps = {
  open: boolean;
  onClose: () => void;
  inventory: Inventory;
};

const MOVEMENT_TYPES = [
  { value: 'STOCK_IN', label: 'Stock In (Receiving)' },
  { value: 'STOCK_OUT', label: 'Stock Out (Allocation)' },
  { value: 'ADJUSTMENT', label: 'Manual Adjustment' },
  { value: 'DAMAGE', label: 'Damaged Goods' },
  { value: 'RETURN_IN', label: 'Customer Return' },
  { value: 'RECOUNT', label: 'Physical Count' },
];

export function AdjustStockModal({ open, onClose, inventory }: AdjustStockModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [movementType, setMovementType] = useState('ADJUSTMENT');
  const [quantityChange, setQuantityChange] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const newQuantity = inventory.quantity + Number(quantityChange || 0);
  const newAvailable = newQuantity - inventory.reservedQty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const change = Number(quantityChange);
    if (isNaN(change) || change === 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await adjustInventory(
        inventory.id,
        change,
        movementType,
        reason,
        notes
      );

      if (result.success) {
        toast.success('Stock adjusted successfully');
        router.refresh();
        onClose();
      } else {
        toast.error(result.error || 'Failed to adjust stock');
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
          <DialogTitle>Adjust Stock</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="border rounded-lg p-3 bg-muted/50 space-y-1">
            <p className="font-semibold">{inventory.product.name}</p>
            <p className="text-sm text-muted-foreground">SKU: {inventory.product.sku}</p>
            <p className="text-sm text-muted-foreground">Site: {inventory.site.name}</p>
            <div className="flex gap-4 mt-2 text-sm">
              <span>Current: <strong>{inventory.quantity} {inventory.product.baseUom}</strong></span>
              <span>Available: <strong>{inventory.availableQty} {inventory.product.baseUom}</strong></span>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="movementType">Movement Type <span className="text-destructive">*</span></Label>
            <Select value={movementType} onValueChange={setMovementType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOVEMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="quantityChange">
              Quantity Change <span className="text-destructive">*</span>
            </Label>
            <Input
              id="quantityChange"
              type="number"
              step="0.01"
              value={quantityChange}
              onChange={(e) => setQuantityChange(e.target.value)}
              placeholder="Enter + or - amount"
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">
              Use positive (+) to add stock, negative (-) to remove
            </p>
          </div>

          {quantityChange && (
            <div className="border rounded-lg p-3 bg-primary/5">
              <p className="text-sm font-medium">New Quantity: {newQuantity} {inventory.product.baseUom}</p>
              <p className="text-sm text-muted-foreground">New Available: {newAvailable} {inventory.product.baseUom}</p>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Received shipment, Damaged"
              className="h-9"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Additional details..."
              className="text-sm"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adjust Stock
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
