'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, ArrowRight } from 'lucide-react';
import { transferStock } from '@/app/actions/inventory-actions';

type Site = {
  id: string;
  code: string;
  name: string;
};

type Product = {
  id: string;
  sku: string;
  name: string;
  baseUom: string;
};

type StockTransferFormProps = {
  sites: Site[];
  products: Product[];
};

export function StockTransferForm({ sites, products }: StockTransferFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    productId: '',
    fromSiteId: '',
    toSiteId: '',
    quantity: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.fromSiteId === formData.toSiteId) {
      toast.error('Source and destination sites must be different');
      return;
    }

    setIsLoading(true);

    try {
      const result = await transferStock({
        productId: formData.productId,
        fromSiteId: formData.fromSiteId,
        toSiteId: formData.toSiteId,
        quantity: parseFloat(formData.quantity),
        notes: formData.notes,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to create transfer');
      }

      toast.success('Stock transfer has been initiated successfully');

      // Reset form
      setFormData({
        productId: '',
        fromSiteId: '',
        toSiteId: '',
        quantity: '',
        notes: '',
      });

      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create transfer');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Product Selection */}
        <div className="space-y-2">
          <Label htmlFor="productId">Product *</Label>
          <Select
            value={formData.productId}
            onValueChange={(value) => setFormData({ ...formData, productId: value })}
            required
          >
            <SelectTrigger id="productId">
              <SelectValue placeholder="Select product" />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Enter quantity"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            required
          />
        </div>

        {/* From Site */}
        <div className="space-y-2">
          <Label htmlFor="fromSiteId">From Site *</Label>
          <Select
            value={formData.fromSiteId}
            onValueChange={(value) => setFormData({ ...formData, fromSiteId: value })}
            required
          >
            <SelectTrigger id="fromSiteId">
              <SelectValue placeholder="Select source site" />
            </SelectTrigger>
            <SelectContent>
              {sites.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name} ({site.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* To Site */}
        <div className="space-y-2">
          <Label htmlFor="toSiteId">To Site *</Label>
          <Select
            value={formData.toSiteId}
            onValueChange={(value) => setFormData({ ...formData, toSiteId: value })}
            required
          >
            <SelectTrigger id="toSiteId">
              <SelectValue placeholder="Select destination site" />
            </SelectTrigger>
            <SelectContent>
              {sites.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name} ({site.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Transfer Preview */}
      {formData.fromSiteId && formData.toSiteId && (
        <div className="flex items-center justify-center gap-4 p-4 bg-muted rounded-lg">
          <div className="text-center">
            <div className="font-semibold">
              {sites.find((s) => s.id === formData.fromSiteId)?.name}
            </div>
            <div className="text-sm text-muted-foreground">Source</div>
          </div>
          <ArrowRight className="h-6 w-6 text-muted-foreground" />
          <div className="text-center">
            <div className="font-semibold">
              {sites.find((s) => s.id === formData.toSiteId)?.name}
            </div>
            <div className="text-sm text-muted-foreground">Destination</div>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Add transfer notes or reference number..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setFormData({
              productId: '',
              fromSiteId: '',
              toSiteId: '',
              quantity: '',
              notes: '',
            });
          }}
        >
          Reset
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Transfer
        </Button>
      </div>
    </form>
  );
}
