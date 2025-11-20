'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { brandFormSchema, type BrandFormValues } from '@/lib/validations/brand-validation';
import { createBrand, updateBrand } from '@/app/actions/brand-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type BrandFormProps = {
  brand?: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    description: string | null;
    website: string | null;
    isFeatured: boolean;
    sortOrder: number;
    isActive: boolean;
  };
};

export function BrandForm({ brand }: BrandFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: {
      name: brand?.name || '',
      slug: brand?.slug || '',
      logo: brand?.logo || '',
      description: brand?.description || '',
      website: brand?.website || '',
      isFeatured: brand?.isFeatured ?? false,
      sortOrder: brand?.sortOrder || 0,
      isActive: brand?.isActive ?? true,
    },
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch } = form;
  const isActive = watch('isActive');
  const isFeatured = watch('isFeatured');

  const onSubmit = async (data: BrandFormValues) => {
    setIsSubmitting(true);

    try {
      const result = brand
        ? await updateBrand(brand.id, data)
        : await createBrand(data);

      if (result.success) {
        toast.success(brand ? 'Brand updated successfully' : 'Brand created successfully');
        router.push('/admin/brands');
        router.refresh();
      } else {
        toast.error(result.error || 'Something went wrong');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="border rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>

        <div className="space-y-2">
          <Label htmlFor="name">
            Brand Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            {...register('name')}
            onChange={(e) => {
              register('name').onChange(e);
              if (!brand) {
                setValue('slug', generateSlug(e.target.value));
              }
            }}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">
            Slug <span className="text-destructive">*</span>
          </Label>
          <Input id="slug" {...register('slug')} />
          {errors.slug && (
            <p className="text-sm text-destructive">{errors.slug.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" {...register('description')} rows={4} />
          {errors.description && (
            <p className="text-sm text-destructive">{errors.description.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="logo">Logo URL</Label>
          <Input id="logo" {...register('logo')} placeholder="https://..." />
          {errors.logo && (
            <p className="text-sm text-destructive">{errors.logo.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input id="website" {...register('website')} placeholder="https://..." />
          {errors.website && (
            <p className="text-sm text-destructive">{errors.website.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="sortOrder">Sort Order</Label>
          <Input
            id="sortOrder"
            type="number"
            {...register('sortOrder', { valueAsNumber: true })}
          />
          {errors.sortOrder && (
            <p className="text-sm text-destructive">{errors.sortOrder.message}</p>
          )}
        </div>
      </div>

      <div className="border rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold">Settings</h3>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Active</Label>
            <p className="text-sm text-muted-foreground">
              Make this brand visible to customers
            </p>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={(checked) => setValue('isActive', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Featured</Label>
            <p className="text-sm text-muted-foreground">
              Show this brand in featured sections
            </p>
          </div>
          <Switch
            checked={isFeatured}
            onCheckedChange={(checked) => setValue('isFeatured', checked)}
          />
        </div>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {brand ? 'Update Brand' : 'Create Brand'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
