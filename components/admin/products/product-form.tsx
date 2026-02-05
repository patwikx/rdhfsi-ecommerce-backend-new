'use client';
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productFormSchema, type ProductFormValues } from '@/lib/validations/product-validation';
import { createProduct, updateProduct } from '@/app/actions/product-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { FileUpload } from '@/components/file-upload';
import Image from 'next/image';

type Product = {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  categoryId: string;
  brandId: string | null;
  model: string | null;
  baseUom: string;
  retailPrice: number;
  wholesalePrice: number | null;
  poPrice: number | null;
  costPrice: number | null;
  compareAtPrice: number | null;
  moq: number;
  bulkPrice: number | null;
  bulkThreshold: number | null;
  weight: number | null;
  dimensions: string | null;
  leadTime: string | null;
  isActive: boolean;
  isFeatured: boolean;
  isPublished: boolean;
  isTrending: boolean;
  isOnSale: boolean;
  isClearance: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  specifications: unknown;
  images: { url: string; sortOrder: number }[];
};

type ProductFormProps = {
  product?: Product;
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
};

export function ProductForm({ product, categories, brands, onSubmitCallback }: ProductFormProps & { onSubmitCallback?: () => void }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<{ url: string; sortOrder: number }[]>(
    product?.images || []
  );

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      sku: product?.sku || '',
      barcode: product?.barcode || '',
      name: product?.name || '',
      slug: product?.slug || '',
      description: product?.description || '',
      shortDescription: product?.shortDescription || '',
      categoryId: product?.categoryId || '',
      brandId: product?.brandId || '',
      model: product?.model || '',
      baseUom: product?.baseUom || 'PC',
      retailPrice: product?.retailPrice ? Number(product.retailPrice) : 0,
      wholesalePrice: product?.wholesalePrice ? Number(product.wholesalePrice) : null,
      poPrice: product?.poPrice ? Number(product.poPrice) : null,
      costPrice: product?.costPrice ? Number(product.costPrice) : null,
      compareAtPrice: product?.compareAtPrice ? Number(product.compareAtPrice) : null,
      moq: product?.moq || 1,
      bulkPrice: product?.bulkPrice ? Number(product.bulkPrice) : null,
      bulkThreshold: product?.bulkThreshold || null,
      weight: product?.weight ? Number(product.weight) : null,
      dimensions: product?.dimensions || '',
      leadTime: product?.leadTime || '',
      isActive: product?.isActive ?? true,
      isFeatured: product?.isFeatured ?? false,
      isPublished: product?.isPublished ?? false,
      isTrending: product?.isTrending ?? false,
      isOnSale: product?.isOnSale ?? false,
      isClearance: product?.isClearance ?? false,
      metaTitle: product?.metaTitle || '',
      metaDescription: product?.metaDescription || '',
      metaKeywords: product?.metaKeywords || '',
      specifications: product?.specifications 
        ? Object.entries(product.specifications as Record<string, string>)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n')
        : '',
    },
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch } = form;

  const onSubmit = async (data: ProductFormValues) => {
    if (images.length === 0) {
      toast.error('Please upload at least one product image');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = product
        ? await updateProduct(product.id, data, images)
        : await createProduct(data, images);

      if (result.success) {
        toast.success(product ? 'Product updated successfully' : 'Product created successfully');
        if (onSubmitCallback) {
          onSubmitCallback();
        } else {
          router.push('/admin/products');
          router.refresh();
        }
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

  const handleImageUpload = (result: { fileUrl: string }) => {
    setImages(prev => [...prev, { url: result.fileUrl, sortOrder: prev.length }]);
    toast.success('Image uploaded successfully');
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Basic Info & Images */}
        <div className="lg:col-span-2 space-y-4">
          {/* Basic Information */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="sku">SKU <span className="text-destructive">*</span></Label>
                <Input id="sku" {...register('sku')} placeholder="PROD-001" className="h-9" />
                {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="barcode">Barcode <span className="text-destructive">*</span></Label>
                <Input id="barcode" {...register('barcode')} placeholder="1234567890" className="h-9" />
                {errors.barcode && <p className="text-xs text-destructive">{errors.barcode.message}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="name">Product Name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                {...register('name')}
                onChange={(e) => {
                  register('name').onChange(e);
                  if (!product) setValue('slug', generateSlug(e.target.value));
                }}
                className="h-9"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="slug">Slug <span className="text-destructive">*</span></Label>
              <Input id="slug" {...register('slug')} className="h-9" />
              {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="shortDescription">Short Description</Label>
              <Textarea id="shortDescription" {...register('shortDescription')} rows={2} className="text-sm" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register('description')} rows={4} className="text-sm" />
            </div>
          </div>

          {/* Images */}
          <div className="border rounded-lg p-4 space-y-3">
            <div>
              <h3 className="font-semibold">Product Images</h3>
              <p className="text-xs text-muted-foreground">Upload up to 5 images. First image will be the primary.</p>
            </div>

            {/* Image Slots */}
            <div className="grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4].map((index) => (
                <div key={index} className="relative group">
                  {images[index] ? (
                    <>
                      <div className="relative h-24 w-full rounded overflow-hidden border-2 border-primary">
                        <Image src={images[index].url} alt={`Product ${index + 1}`} fill className="object-cover" />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      {index === 0 && (
                        <span className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-[10px] px-1 py-0.5 rounded">
                          Primary
                        </span>
                      )}
                    </>
                  ) : (
                    <div className="h-24 w-full rounded border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/30">
                      <span className="text-xs text-muted-foreground">{index + 1}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {images.length < 5 && (
              <div className="pt-2">
                <FileUpload
                  onUploadComplete={handleImageUpload}
                  onUploadError={(error) => toast.error(error)}
                  accept=".jpg,.jpeg,.png,.webp"
                  maxSize={5}
                  multiple
                  maxFiles={5 - images.length}
                  className="scale-90"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Categorization, Pricing, Status */}
        <div className="space-y-4">
          {/* Categorization */}
          <div className="border rounded-lg p-4 space-y-3">
            <div>
              <h3 className="font-semibold">Categorization</h3>
              <p className="text-xs text-muted-foreground">Organize product by category and brand</p>
            </div>
            
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="categoryId">Category <span className="text-destructive">*</span></Label>
                <Select value={watch('categoryId')} onValueChange={(value) => setValue('categoryId', value)}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId.message}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="brandId">Brand</Label>
                <Select
                  value={(watch('brandId') as string) || 'none'}
                  onValueChange={(value) => {
                    if (value === 'none') {
                      setValue('brandId', null);
                    } else {
                      setValue('brandId', value);
                    }
                  }}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Brand</SelectItem>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="model">Model</Label>
              <Input id="model" {...register('model')} className="h-9" />
            </div>
          </div>

          {/* Pricing - Continue in next part */}
          {/* Pricing */}
          <div className="border rounded-lg p-4 space-y-3">
            <div>
              <h3 className="font-semibold">Pricing</h3>
              <p className="text-xs text-muted-foreground">Set retail, wholesale, PO, and bulk pricing</p>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="baseUom">UOM <span className="text-destructive">*</span></Label>
                <Input id="baseUom" {...register('baseUom')} placeholder="PC" className="h-9" />
                {errors.baseUom && <p className="text-xs text-destructive">{errors.baseUom.message}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="retailPrice">Retail <span className="text-destructive">*</span></Label>
                <Input id="retailPrice" type="number" step="0.01" {...register('retailPrice', { valueAsNumber: true })} className="h-9" />
                {errors.retailPrice && <p className="text-xs text-destructive">{errors.retailPrice.message}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="wholesalePrice" className="text-blue-600">Wholesale</Label>
                <Input id="wholesalePrice" type="number" step="0.01" {...register('wholesalePrice', { valueAsNumber: true })} className="h-9" />
              </div>

              <div className="space-y-1">
                <Label htmlFor="poPrice" className="text-purple-600">PO Price</Label>
                <Input id="poPrice" type="number" step="0.01" {...register('poPrice', { valueAsNumber: true })} className="h-9" />
              </div>

              <div className="space-y-1">
                <Label htmlFor="costPrice">Cost</Label>
                <Input id="costPrice" type="number" step="0.01" {...register('costPrice', { valueAsNumber: true })} className="h-9" />
              </div>

              <div className="space-y-1">
                <Label htmlFor="compareAtPrice">Compare</Label>
                <Input id="compareAtPrice" type="number" step="0.01" {...register('compareAtPrice', { valueAsNumber: true })} className="h-9" />
              </div>

              <div className="space-y-1">
                <Label htmlFor="moq">MOQ</Label>
                <Input id="moq" type="number" {...register('moq', { valueAsNumber: true })} className="h-9" />
              </div>

              <div className="space-y-1">
                <Label htmlFor="bulkPrice">Bulk Price</Label>
                <Input id="bulkPrice" type="number" step="0.01" {...register('bulkPrice', { valueAsNumber: true })} className="h-9" />
              </div>
            </div>
          </div>

          {/* Physical */}
          <div className="border rounded-lg p-4 space-y-3">
            <div>
              <h3 className="font-semibold">Physical Properties</h3>
              <p className="text-xs text-muted-foreground">Weight, dimensions, and lead time</p>
            </div>
            
            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input id="weight" type="number" step="0.01" {...register('weight', { valueAsNumber: true })} className="h-9" />
              </div>

              <div className="space-y-1">
                <Label htmlFor="dimensions">Dimensions</Label>
                <Input id="dimensions" {...register('dimensions')} placeholder="L x W x H" className="h-9" />
              </div>

              <div className="space-y-1">
                <Label htmlFor="leadTime">Lead Time</Label>
                <Input id="leadTime" {...register('leadTime')} placeholder="1-2 Days" className="h-9" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEO, Specs, Status - 3 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* SEO */}
        <div className="border rounded-lg p-4 space-y-3">
          <div>
            <h3 className="font-semibold">SEO & Meta</h3>
            <p className="text-xs text-muted-foreground">Optimize for search engines</p>
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="metaTitle">Meta Title</Label>
            <Input id="metaTitle" {...register('metaTitle')} className="h-9" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="metaDescription">Meta Description</Label>
            <Textarea id="metaDescription" {...register('metaDescription')} rows={3} className="text-sm" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="metaKeywords">Keywords</Label>
            <Input id="metaKeywords" {...register('metaKeywords')} placeholder="keyword1, keyword2" className="h-9" />
          </div>
        </div>

        {/* Specifications */}
        <div className="border rounded-lg p-4 space-y-3">
          <div>
            <h3 className="font-semibold">Specifications</h3>
            <p className="text-xs text-muted-foreground">Product technical details</p>
          </div>
          <div className="space-y-1">
            <Textarea
              id="specifications"
              {...register('specifications')}
              rows={8}
              placeholder="Color: Red&#10;Size: Large&#10;Material: Cotton&#10;Warranty: 1 Year"
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">Enter one spec per line (Key: Value)</p>
          </div>
        </div>

        {/* Status moved here */}
        <div className="border rounded-lg p-4 space-y-2">
          <div className="mb-2">
            <h3 className="font-semibold">Status & Visibility</h3>
            <p className="text-xs text-muted-foreground">Control product visibility and badges</p>
          </div>
          
          <div className="flex items-center justify-between py-1">
            <Label className="text-sm">Active</Label>
            <Switch checked={watch('isActive')} onCheckedChange={(checked) => setValue('isActive', checked)} />
          </div>

          <div className="flex items-center justify-between py-1">
            <Label className="text-sm">Published</Label>
            <Switch checked={watch('isPublished')} onCheckedChange={(checked) => setValue('isPublished', checked)} />
          </div>

          <div className="flex items-center justify-between py-1">
            <Label className="text-sm">Featured</Label>
            <Switch checked={watch('isFeatured')} onCheckedChange={(checked) => setValue('isFeatured', checked)} />
          </div>

          <div className="flex items-center justify-between py-1">
            <Label className="text-sm">Trending</Label>
            <Switch checked={watch('isTrending')} onCheckedChange={(checked) => setValue('isTrending', checked)} />
          </div>

          <div className="flex items-center justify-between py-1">
            <Label className="text-sm">On Sale</Label>
            <Switch checked={watch('isOnSale')} onCheckedChange={(checked) => setValue('isOnSale', checked)} />
          </div>

          <div className="flex items-center justify-between py-1">
            <Label className="text-sm">Clearance</Label>
            <Switch checked={watch('isClearance')} onCheckedChange={(checked) => setValue('isClearance', checked)} />
          </div>
        </div>
      </div>
    </form>
  );
}
