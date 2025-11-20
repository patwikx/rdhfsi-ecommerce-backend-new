'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HeroBanner } from '@prisma/client';
import { createBanner, updateBanner } from '@/app/actions/banner-actions';
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
import { FileUpload, UploadedFileDisplay } from '@/components/file-upload';
import { toast } from 'sonner';
import { Loader2, Image, CalendarIcon, Palette, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface BannerFormProps {
  banner?: HeroBanner;
}

export function BannerForm({ banner }: BannerFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>(banner?.images || []);
  const [startDate, setStartDate] = useState<Date | undefined>(
    banner?.startDate ? new Date(banner.startDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    banner?.endDate ? new Date(banner.endDate) : undefined
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (images.length === 0) {
      toast.error('Please upload at least one banner image');
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    formData.set('images', JSON.stringify(images));
    formData.set('image', images[0]); // Set first image as primary
    if (startDate) formData.set('startDate', startDate.toISOString());
    if (endDate) formData.set('endDate', endDate.toISOString());

    const result = banner
      ? await updateBanner(banner.id, formData)
      : await createBanner(formData);

    if (result.success) {
      toast.success(banner ? 'Banner updated successfully' : 'Banner created successfully');
      router.push('/admin/marketing/banners');
    } else {
      toast.error(result.error || 'Failed to save banner');
    }

    setIsSubmitting(false);
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
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
            {banner ? 'Edit Banner' : 'Create Banner'}
          </h1>
          <p className="text-muted-foreground">
            {banner ? `Update banner: ${banner.title}` : 'Add a new promotional banner'}
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
            {banner ? 'Update Banner' : 'Create Banner'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Image className="w-5 h-5" />
            Basic Information
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                defaultValue={banner?.title}
                placeholder="Summer Sale 2024"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={banner?.description || ''}
                placeholder="Get up to 50% off on selected items"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>
                Banner Images <span className="text-red-500">*</span>
              </Label>

              {/* Uploaded Images Grid */}
              {images.length > 0 && (
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {images.map((imageUrl, index) => (
                    <div key={index} className="space-y-2">
                      <div className="relative w-full aspect-[16/9] rounded-lg border overflow-hidden bg-muted group">
                        <img
                          src={imageUrl}
                          alt={`Banner ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveImage(index)}
                          disabled={isSubmitting}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        Image {index + 1} {index === 0 && '(Primary)'}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Component */}
              {images.length < 5 && (
                <FileUpload
                  onUploadComplete={(result) => {
                    setImages((prev) => [...prev, result.fileUrl]);
                    // Toast is already shown by FileUpload component
                  }}
                  onUploadError={(error) => {
                    // Error toast is already shown by FileUpload component
                  }}
                  disabled={isSubmitting}
                  maxSize={10}
                  accept=".jpg,.jpeg,.png,.gif,.webp"
                  multiple={true}
                  maxFiles={5 - images.length}
                />
              )}

              <p className="text-xs text-muted-foreground">
                Upload up to 5 banner images (JPG, PNG, GIF, WebP - Max 10MB each). Recommended size: 1920x720px. First image will be the primary banner.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="link">Link URL (Optional)</Label>
              <Input
                id="link"
                name="link"
                type="url"
                defaultValue={banner?.link || ''}
                placeholder="https://example.com/sale"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="buttonText">Button Text (Optional)</Label>
              <Input
                id="buttonText"
                name="buttonText"
                defaultValue={banner?.buttonText || ''}
                placeholder="Shop Now"
              />
            </div>
          </div>
        </div>

        {/* Placement & Display */}
        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Placement & Display
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="placement">Placement</Label>
              <Select name="placement" defaultValue={banner?.placement || 'HOME'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HOME">Home</SelectItem>
                  <SelectItem value="TRENDING">Trending</SelectItem>
                  <SelectItem value="SALE">Sale</SelectItem>
                  <SelectItem value="CLEARANCE">Clearance</SelectItem>
                  <SelectItem value="FEATURED">Featured</SelectItem>
                  <SelectItem value="NEW_ARRIVALS">New Arrivals</SelectItem>
                  <SelectItem value="BRANDS">Brands</SelectItem>
                  <SelectItem value="CATEGORY">Category</SelectItem>
                  <SelectItem value="SEARCH">Search</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                name="sortOrder"
                type="number"
                min="0"
                defaultValue={banner?.sortOrder || 0}
                required
              />
              <p className="text-xs text-muted-foreground">
                Lower numbers appear first
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="textColor">Text Color</Label>
                <Input
                  id="textColor"
                  name="textColor"
                  type="color"
                  defaultValue={banner?.textColor || '#ffffff'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="overlayColor">Overlay Color</Label>
                <Input
                  id="overlayColor"
                  name="overlayColor"
                  type="color"
                  defaultValue={banner?.overlayColor || '#000000'}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Start Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !startDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !endDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-sm text-muted-foreground">
                Leave dates empty for always-active banner
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Active</Label>
                <p className="text-sm text-muted-foreground">
                  Enable this banner
                </p>
              </div>
              <Switch
                id="isActive"
                name="isActive"
                defaultChecked={banner?.isActive ?? true}
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
