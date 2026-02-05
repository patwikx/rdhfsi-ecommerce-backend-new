'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Loader2, Plus, Minus, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { adjustStock } from '@/app/actions/inventory-actions';

type Inventory = {
  id: string;
  quantity: number;
  reservedQty: number;
  availableQty: number;
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

type StockAdjustmentFormProps = {
  inventory: Inventory;
};

export function StockAdjustmentForm({ inventory }: StockAdjustmentFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'IN' | 'OUT'>('IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');

  const newQuantity = adjustmentType === 'IN'
    ? inventory.quantity + parseFloat(quantity || '0')
    : inventory.quantity - parseFloat(quantity || '0');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (parseFloat(quantity) <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    if (adjustmentType === 'OUT' && parseFloat(quantity) > inventory.availableQty) {
      toast.error('Cannot adjust more than available quantity');
      return;
    }

    setIsLoading(true);

    try {
      const result = await adjustStock({
        inventoryId: inventory.id,
        type: adjustmentType,
        quantity: parseFloat(quantity),
        reason,
        reference,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to adjust stock');
      }

      toast.success(`Successfully ${adjustmentType === 'IN' ? 'added' : 'removed'} ${quantity} ${inventory.product.baseUom}`);

      router.push('/admin/inventory');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to adjust stock');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Adjustment Type */}
      <div className="space-y-3">
        <Label>Adjustment Type *</Label>
        <RadioGroup
          value={adjustmentType}
          onValueChange={(value) => setAdjustmentType(value as 'IN' | 'OUT')}
          className="grid grid-cols-2 gap-4"
        >
          <div>
            <RadioGroupItem
              value="IN"
              id="in"
              className="peer sr-only"
            />
            <Label
              htmlFor="in"
              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
            >
              <Plus className="mb-3 h-6 w-6" />
              <div className="text-center">
                <div className="font-semibold">Stock In</div>
                <div className="text-sm text-muted-foreground">Add inventory</div>
              </div>
            </Label>
          </div>
          <div>
            <RadioGroupItem
              value="OUT"
              id="out"
              className="peer sr-only"
            />
            <Label
              htmlFor="out"
              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
            >
              <Minus className="mb-3 h-6 w-6" />
              <div className="text-center">
                <div className="font-semibold">Stock Out</div>
                <div className="text-sm text-muted-foreground">Remove inventory</div>
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Quantity */}
      <div className="space-y-2">
        <Label htmlFor="quantity">Quantity ({inventory.product.baseUom}) *</Label>
        <Input
          id="quantity"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Enter quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
        />
      </div>

      {/* Preview */}
      {quantity && parseFloat(quantity) > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>Current: {inventory.quantity} {inventory.product.baseUom}</span>
              <span className="mx-2">→</span>
              <span className={`font-semibold ${newQuantity < 0 ? 'text-red-600' : ''}`}>
                New: {newQuantity.toFixed(2)} {inventory.product.baseUom}
              </span>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Reason */}
      <div className="space-y-2">
        <Label htmlFor="reason">Reason *</Label>
        <Textarea
          id="reason"
          placeholder="Explain the reason for this adjustment..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          rows={3}
        />
      </div>

      {/* Reference */}
      <div className="space-y-2">
        <Label htmlFor="reference">Reference Number</Label>
        <Input
          id="reference"
          placeholder="PO number, invoice, etc. (optional)"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
      </div>

      {/* Submit Buttons */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Confirm Adjustment
        </Button>
      </div>
    </form>
  );
}
