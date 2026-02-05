'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { createCoupon, updateCoupon } from '@/app/actions/coupon-actions';
import { toast } from 'sonner';
import { Loader2, Ticket, Percent, Shield, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { CouponListItem } from '@/app/actions/coupon-actions';
import { CouponType } from '@prisma/client';

type CouponFormProps = {
  coupon?: CouponListItem;
};

export function CouponForm({ coupon }: CouponFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [discountType, setDiscountType] = useState<CouponType>(
    coupon?.discountType || 'PERCENTAGE'
  );
  const [validFrom, setValidFrom] = useState<Date | undefined>(
    coupon?.validFrom ? new Date(coupon.validFrom) : undefined
  );
  const [validUntil, setValidUntil] = useState<Date | undefined>(
    coupon?.validUntil ? new Date(coupon.validUntil) : undefined
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    if (!validFrom || !validUntil) {
      toast.error('Please select valid from and until dates');
      setIsSubmitting(false);
      return;
    }

    const data = {
      code: formData.get('code') as string,
      name: formData.get('name') as string,
      description: formData.get('description') as string || undefined,
      discountType,
      discountValue: parseFloat(formData.get('discountValue') as string),
      minPurchaseAmount: formData.get('minPurchaseAmount')
        ? parseFloat(formData.get('minPurchaseAmount') as string)
        : undefined,
      maxDiscountAmount: formData.get('maxDiscountAmount')
        ? parseFloat(formData.get('maxDiscountAmount') as string)
        : undefined,
      usageLimit: formData.get('usageLimit')
        ? parseInt(formData.get('usageLimit') as string)
        : undefined,
      perUserLimit: formData.get('perUserLimit')
        ? parseInt(formData.get('perUserLimit') as string)
        : undefined,
      validFrom,
      validUntil,
      isActive: formData.get('isActive') === 'on',
      isPublic: formData.get('isPublic') === 'on',
      stackable: formData.get('stackable') === 'on',
    };

    const result = coupon
      ? await updateCoupon(coupon.id, data)
      : await createCoupon(data);

    if (result.success) {
      toast.success(coupon ? 'Coupon updated successfully' : 'Coupon created successfully');
      router.push('/admin/marketing/coupons');
    } else {
      toast.error(result.error || 'Failed to save coupon');
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
            {coupon ? 'Edit Coupon' : 'Create Coupon'}
          </h1>
          <p className="text-muted-foreground">
            {coupon ? `Update coupon: ${coupon.code}` : 'Add a new promotional coupon code'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {coupon ? 'Update Coupon' : 'Create Coupon'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Ticket className="w-5 h-5" />
            Basic Information
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">
                Coupon Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="code"
                name="code"
                defaultValue={coupon?.code}
                placeholder="SUMMER2024"
                required
                disabled={!!coupon}
                className={coupon ? 'bg-muted uppercase' : 'uppercase'}
              />
              <p className="text-xs text-muted-foreground">
                Unique code customers will enter at checkout
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={coupon?.name}
                placeholder="Summer Sale 2024"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={coupon?.description || ''}
                placeholder="Get 20% off on all summer items"
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
              <Select value={discountType} onValueChange={(value) => setDiscountType(value as CouponType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                  <SelectItem value="FIXED_AMOUNT">Fixed Amount</SelectItem>
                  <SelectItem value="FREE_SHIPPING">Free Shipping</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {discountType !== 'FREE_SHIPPING' && (
              <div className="col-span-1 space-y-2">
                <Label htmlFor="discountValue">
                  {discountType === 'PERCENTAGE' ? 'Percentage' : 'Amount (PHP)'} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="discountValue"
                  name="discountValue"
                  type="number"
                  step="0.01"
                  min="0"
                  max={discountType === 'PERCENTAGE' ? 100 : undefined}
                  defaultValue={coupon?.discountValue || ''}
                  placeholder={discountType === 'PERCENTAGE' ? '20' : '100.00'}
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
              <Label>Valid From <span className="text-red-500">*</span></Label>
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
                  <Calendar mode="single" selected={validFrom} onSelect={setValidFrom} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="col-span-1 space-y-2">
              <Label>Valid Until <span className="text-red-500">*</span></Label>
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
                  <Calendar mode="single" selected={validUntil} onSelect={setValidUntil} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="lg:col-span-2 border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Active</Label>
                <p className="text-sm text-muted-foreground">Enable this coupon</p>
              </div>
              <Switch id="isActive" name="isActive" defaultChecked={coupon?.isActive ?? true} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isPublic">Public</Label>
                <p className="text-sm text-muted-foreground">Show in promotions</p>
              </div>
              <Switch id="isPublic" name="isPublic" defaultChecked={coupon?.isPublic ?? true} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="stackable">Stackable</Label>
                <p className="text-sm text-muted-foreground">Combine with discounts</p>
              </div>
              <Switch id="stackable" name="stackable" defaultChecked={coupon?.stackable ?? false} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="col-span-1 space-y-2">
              <Label htmlFor="usageLimit">Total Usage Limit</Label>
              <Input
                id="usageLimit"
                name="usageLimit"
                type="number"
                min="0"
                defaultValue={coupon?.usageLimit || ''}
                placeholder="No limit"
              />
            </div>

            <div className="col-span-1 space-y-2">
              <Label htmlFor="perUserLimit">Per User Limit</Label>
              <Input
                id="perUserLimit"
                name="perUserLimit"
                type="number"
                min="0"
                defaultValue={coupon?.perUserLimit || ''}
                placeholder="No limit"
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
