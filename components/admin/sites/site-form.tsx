'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { siteFormSchema, type SiteFormValues } from '@/lib/validations/site-validation';
import { createSite, updateSite } from '@/app/actions/site-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type SiteFormProps = {
  site?: {
    id: string;
    code: string;
    name: string;
    type: string;
    isMarkdown: boolean;
    isActive: boolean;
    address: string | null;
    phone: string | null;
    email: string | null;
  };
};

export function SiteForm({ site }: SiteFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SiteFormValues>({
    resolver: zodResolver(siteFormSchema),
    defaultValues: {
      code: site?.code || '',
      name: site?.name || '',
      type: (site?.type as 'STORE' | 'WAREHOUSE' | 'MARKDOWN') || 'STORE',
      isMarkdown: site?.isMarkdown ?? false,
      isActive: site?.isActive ?? true,
      address: site?.address || '',
      phone: site?.phone || '',
      email: site?.email || '',
    },
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch } = form;
  const isActive = watch('isActive');
  const isMarkdown = watch('isMarkdown');
  const siteType = watch('type');

  const onSubmit = async (data: SiteFormValues) => {
    setIsSubmitting(true);

    try {
      const result = site
        ? await updateSite(site.id, data)
        : await createSite(data);

      if (result.success) {
        toast.success(site ? 'Site updated successfully' : 'Site created successfully');
        router.push('/admin/sites');
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="border rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">
                Site Code <span className="text-destructive">*</span>
              </Label>
              <Input id="code" {...register('code')} placeholder="WH01" />
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">
                Site Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={siteType}
                onValueChange={(value) => setValue('type', value as 'STORE' | 'WAREHOUSE' | 'MARKDOWN')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STORE">Store</SelectItem>
                  <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                  <SelectItem value="MARKDOWN">Markdown</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-destructive">{errors.type.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">
              Site Name <span className="text-destructive">*</span>
            </Label>
            <Input id="name" {...register('name')} placeholder="Main Warehouse" />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" {...register('address')} rows={3} />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register('phone')} placeholder="+1234567890" />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} placeholder="site@example.com" />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>
        </div>

      <div className="border rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold">Settings</h3>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Active</Label>
              <p className="text-sm text-muted-foreground">
                Enable this site for operations
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={(checked) => setValue('isActive', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Markdown Site</Label>
              <p className="text-sm text-muted-foreground">
                Mark this as a markdown/clearance location
              </p>
            </div>
            <Switch
              checked={isMarkdown}
              onCheckedChange={(checked) => setValue('isMarkdown', checked)}
            />
          </div>
        </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {site ? 'Update Site' : 'Create Site'}
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
