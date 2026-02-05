'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { categoryFormSchema, type CategoryFormValues } from '@/lib/validations/category-validation';
import { createCategory, updateCategory } from '@/app/actions/category-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type CategoryFormProps = {
  category?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    image: string | null;
    parentId: string | null;
    isActive: boolean;
    isFeatured: boolean;
    sortOrder: number;
  };
  parentCategories: { id: string; name: string }[];
};

export function CategoryForm({ category, parentCategories }: CategoryFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category?.name || '',
      slug: category?.slug || '',
      description: category?.description || '',
      image: category?.image || '',
      parentId: category?.parentId || undefined,
      isActive: category?.isActive ?? true,
      isFeatured: category?.isFeatured ?? false,
      sortOrder: category?.sortOrder || 0,
    },
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch } = form;
  const isActive = watch('isActive');
  const isFeatured = watch('isFeatured');
  const parentId = watch('parentId');

  const onSubmit = async (data: CategoryFormValues) => {
    setIsSubmitting(true);

    try {
      const result = category
        ? await updateCategory(category.id, data)
        : await createCategory(data);

      if (result.success) {
        toast.success(category ? 'Category updated successfully' : 'Category created successfully');
        router.push('/admin/categories');
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
              Category Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              {...register('name')}
              onChange={(e) => {
                register('name').onChange(e);
                if (!category) {
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
            <Label htmlFor="parentId">Parent Category</Label>
            <Select
              value={parentId || 'none'}
              onValueChange={(value) => setValue('parentId', value === 'none' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select parent category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Top Level)</SelectItem>
                {parentCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Image URL</Label>
            <Input id="image" {...register('image')} placeholder="https://..." />
            {errors.image && (
              <p className="text-sm text-destructive">{errors.image.message}</p>
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
                Make this category visible to customers
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
                Show this category in featured sections
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
          {category ? 'Update Category' : 'Create Category'}
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
