'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { createTaxRate, updateTaxRate } from '@/app/actions/tax-actions';
import { toast } from 'sonner';
import { Loader2, Receipt, CalendarIcon, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { TaxRateListItem } from '@/app/actions/tax-actions';

type TaxRateFormProps = {
  taxRate?: TaxRateListItem;
};

export function TaxRateForm({ taxRate }: TaxRateFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validFrom, setValidFrom] = useState<Date | undefined>(
    taxRate?.validFrom ? new Date(taxRate.validFrom) : undefined
  );
  const [validUntil, setValidUntil] = useState<Date | undefined>(
    taxRate?.validUntil ? new Date(taxRate.validUntil) : undefined
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    const data = {
      name: formData.get('name') as string,
      code: formData.get('code') as string,
      description: formData.get('description') as string || undefined,
      rate: parseFloat(formData.get('rate') as string),
      country: formData.get('country') as string,
      provinces: [],
      cities: [],
      applicableCategories: [],
      excludedCategories: [],
      isDefault: formData.get('isDefault') === 'on',
      isCompound: formData.get('isCompound') === 'on',
      priority: parseInt(formData.get('priority') as string) || 0,
      isActive: formData.get('isActive') === 'on',
      validFrom,
      validUntil,
    };

    const result = taxRate
      ? await updateTaxRate(taxRate.id, data)
      : await createTaxRate(data);

    if (result.success) {
      toast.success(taxRate ? 'Tax rate updated successfully' : 'Tax rate created successfully');
      router.push('/admin/settings/tax');
    } else {
      toast.error(result.error || 'Failed to save tax rate');
    }

    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          <span>←</span>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {taxRate ? 'Edit Tax Rate' : 'Create Tax Rate'}
          </h1>
          <p className="text-muted-foreground">
            {taxRate ? `Update tax rate: ${taxRate.name}` : 'Add a new tax rate configuration'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {taxRate ? 'Update Tax Rate' : 'Create Tax Rate'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Basic Information
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">
                Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="code"
                name="code"
                defaultValue={taxRate?.code}
                placeholder="VAT12"
                required
                disabled={!!taxRate}
                className={taxRate ? 'bg-muted' : ''}
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier (e.g., VAT12, ZERO, EXEMPT)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={taxRate?.name}
                placeholder="VAT 12%"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={taxRate?.description || ''}
                placeholder="Standard VAT rate for Philippines"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate">
                Tax Rate (%) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="rate"
                name="rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                defaultValue={taxRate?.rate || ''}
                placeholder="12.00"
                required
              />
            </div>
          </div>
        </div>

        {/* Geographic & Settings */}
        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Geographic & Settings
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                name="country"
                defaultValue={taxRate?.country || 'Philippines'}
                placeholder="Philippines"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Input
                id="priority"
                name="priority"
                type="number"
                min="0"
                defaultValue={taxRate?.priority || 0}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Higher priority rules applied first
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Valid From (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !validFrom && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {validFrom ? format(validFrom, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={validFrom}
                      onSelect={setValidFrom}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Valid Until (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !validUntil && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {validUntil ? format(validUntil, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={validUntil}
                      onSelect={setValidUntil}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-sm text-muted-foreground">
                Leave dates empty for always-active tax rate
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isDefault">Default Tax Rate</Label>
                  <p className="text-sm text-muted-foreground">
                    Use as default for all products
                  </p>
                </div>
                <Switch
                  id="isDefault"
                  name="isDefault"
                  defaultChecked={taxRate?.isDefault ?? false}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isCompound">Compound Tax</Label>
                  <p className="text-sm text-muted-foreground">
                    Calculate tax on tax
                  </p>
                </div>
                <Switch
                  id="isCompound"
                  name="isCompound"
                  defaultChecked={taxRate?.isCompound ?? false}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive">Active</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable this tax rate
                  </p>
                </div>
                <Switch
                  id="isActive"
                  name="isActive"
                  defaultChecked={taxRate?.isActive ?? true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
