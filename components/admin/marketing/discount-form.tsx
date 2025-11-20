'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { createDiscountType, updateDiscountType } from '@/app/actions/discount-actions';
import { toast } from 'sonner';
import { Loader2, Tag, Percent, Shield, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DiscountTypeListItem } from '@/app/actions/discount-actions';

type DiscountFormProps = {
  discount?: DiscountTypeListItem;
};

export function DiscountForm({ discount }: DiscountFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>(
    discount?.discountPercent ? 'percent' : 'fixed'
  );
  const [validFrom, setValidFrom] = useState<Date | undefined>(
    discount?.validFrom ? new Date(discount.validFrom) : undefined
  );
  const [validUntil, setValidUntil] = useState<Date | undefined>(
    discount?.validUntil ? new Date(discount.validUntil) : undefined
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    
    const data = {
      code: formData.get('code') as string,
      name: formData.get('name') as string,
      description: formData.get('description') as string || undefined,
      discountPercent: discountType === 'percent' 
        ? parseFloat(formData.get('discountPercent') as string) 
        : undefined,
      discountAmount: discountType === 'fixed'
        ? parseFloat(formData.get('discountAmount') as string)
        : undefined,
      requiresVerification: formData.get('requiresVerification') === 'on',
      requiresCode: formData.get('requiresCode') === 'on',
      minPurchaseAmount: formData.get('minPurchaseAmount')
        ? parseFloat(formData.get('minPurchaseAmount') as string)
        : undefined,
      maxDiscountAmount: formData.get('maxDiscountAmount')
        ? parseFloat(formData.get('maxDiscountAmount') as string)
        : undefined,
      applicableToSale: formData.get('applicableToSale') === 'on',
      priority: parseInt(formData.get('priority') as string) || 0,
      isActive: formData.get('isActive') === 'on',
      validFrom: validFrom,
      validUntil: validUntil,
      usageLimit: formData.get('usageLimit')
        ? parseInt(formData.get('usageLimit') as string)
        : undefined,
    };

    const result = discount
      ? await updateDiscountType(discount.id, data)
      : await createDiscountType(data);

    if (result.success) {
      toast.success(discount ? 'Discount updated successfully' : 'Discount created successfully');
      router.push('/admin/marketing/discounts');
    } else {
      toast.error(result.error || 'Failed to save discount');
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
          <Loader2 className={cn('w-4 h-4', isSubmitting ? 'animate-spin' : 'hidden')} />
          <span className={cn(isSubmitting && 'hidden')}>←</span>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {discount ? 'Edit Discount Type' : 'Create Discount Type'}
          </h1>
          <p className="text-muted-foreground">
            {discount ? `Update discount type: ${discount.name}` : 'Add a new discount type for your store'}
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
            {discount ? 'Update Discount' : 'Create Discount'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Tag className="w-5 h-5" />
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
                defaultValue={discount?.code}
                placeholder="SENIOR"
                required
                disabled={!!discount}
                className={discount ? 'bg-muted' : ''}
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier (e.g., SENIOR, PWD, EMPLOYEE)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={discount?.name}
                placeholder="Senior Citizen Discount"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={discount?.description || ''}
                placeholder="Discount for senior citizens (60 years and above)"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Discount Configuration & Validity */}
        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Percent className="w-5 h-5" />
            Discount Configuration & Validity
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-1 space-y-2">
              <Label>Discount Type</Label>
              <Select
                value={discountType}
                onValueChange={(value) => setDiscountType(value as 'percent' | 'fixed')}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {discountType === 'percent' ? (
              <div className="col-span-1 space-y-2">
                <Label htmlFor="discountPercent">
                  Discount Percentage <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="discountPercent"
                  name="discountPercent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  defaultValue={discount?.discountPercent || ''}
                  placeholder="20"
                  required
                />
              </div>
            ) : (
              <div className="col-span-1 space-y-2">
                <Label htmlFor="discountAmount">
                  Discount Amount (PHP) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="discountAmount"
                  name="discountAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={discount?.discountAmount || ''}
                  placeholder="100.00"
                  required
                />
              </div>
            )}

            <div className="col-span-1 space-y-2">
              <Label htmlFor="minPurchaseAmount">Min Purchase (PHP)</Label>
              <Input
                id="minPurchaseAmount"
                name="minPurchaseAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
              />
            </div>

            <div className="col-span-1 space-y-2">
              <Label htmlFor="maxDiscountAmount">Max Discount (PHP)</Label>
              <Input
                id="maxDiscountAmount"
                name="maxDiscountAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="No limit"
              />
            </div>

            <div className="col-span-2 pt-4 border-t"></div>

            <div className="col-span-1 space-y-2">
              <Label>Valid From</Label>
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
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="col-span-1 space-y-2">
              <Label>Valid Until</Label>
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
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="col-span-2">
              <p className="text-sm text-muted-foreground">
                Leave empty for no time restrictions
              </p>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Settings
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="requiresVerification">Requires Verification</Label>
                <p className="text-sm text-muted-foreground">
                  Require ID verification for this discount
                </p>
              </div>
              <Switch
                id="requiresVerification"
                name="requiresVerification"
                defaultChecked={discount?.requiresVerification ?? true}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="applicableToSale">Applicable to Sale Items</Label>
                <p className="text-sm text-muted-foreground">
                  Can be used on discounted products
                </p>
              </div>
              <Switch
                id="applicableToSale"
                name="applicableToSale"
                defaultChecked={discount?.applicableToSale ?? true}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Active</Label>
                <p className="text-sm text-muted-foreground">
                  Enable this discount type
                </p>
              </div>
              <Switch
                id="isActive"
                name="isActive"
                defaultChecked={discount?.isActive ?? true}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="col-span-1 space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  name="priority"
                  type="number"
                  defaultValue={discount?.priority || 0}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Higher priority applied first
                </p>
              </div>

              <div className="col-span-1 space-y-2">
                <Label htmlFor="usageLimit">Usage Limit</Label>
                <Input
                  id="usageLimit"
                  name="usageLimit"
                  type="number"
                  min="0"
                  placeholder="No limit"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for unlimited
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </form>
  );
}
