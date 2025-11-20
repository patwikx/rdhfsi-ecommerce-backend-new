'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { createSystemSetting, updateSystemSetting } from '@/app/actions/system-settings-actions';
import { toast } from 'sonner';
import { Loader2, Settings } from 'lucide-react';
import type { SystemSettingListItem } from '@/app/actions/system-settings-actions';

type SystemSettingFormProps = {
  setting?: SystemSettingListItem;
};

export function SystemSettingForm({ setting }: SystemSettingFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dataType, setDataType] = useState<'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON' | 'DATE'>(setting?.dataType || 'STRING');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    const data = {
      key: formData.get('key') as string,
      value: formData.get('value') as string,
      dataType: formData.get('dataType') as 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON' | 'DATE',
      category: formData.get('category') as string,
      label: formData.get('label') as string,
      description: formData.get('description') as string || undefined,
      isPublic: formData.get('isPublic') === 'on',
      isEditable: formData.get('isEditable') === 'on',
    };

    const result = setting
      ? await updateSystemSetting(setting.id, data)
      : await createSystemSetting(data);

    if (result.success) {
      toast.success(setting ? 'Setting updated successfully' : 'Setting created successfully');
      router.push('/admin/settings');
    } else {
      toast.error(result.error || 'Failed to save setting');
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
            {setting ? 'Edit Setting' : 'Create Setting'}
          </h1>
          <p className="text-muted-foreground">
            {setting ? `Update setting: ${setting.label}` : 'Add a new system setting'}
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
            {setting ? 'Update Setting' : 'Create Setting'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Basic Information
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="key">
                Key <span className="text-red-500">*</span>
              </Label>
              <Input
                id="key"
                name="key"
                defaultValue={setting?.key}
                placeholder="site.name"
                required
                disabled={!!setting}
                className={setting ? 'bg-muted' : ''}
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier (e.g., site.name, tax.default_rate)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="label">
                Label <span className="text-red-500">*</span>
              </Label>
              <Input
                id="label"
                name="label"
                defaultValue={setting?.label}
                placeholder="Site Name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">
                Category <span className="text-red-500">*</span>
              </Label>
              <Input
                id="category"
                name="category"
                defaultValue={setting?.category}
                placeholder="general"
                required
              />
              <p className="text-xs text-muted-foreground">
                e.g., general, tax, payment, shipping, email
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={setting?.description || ''}
                placeholder="Description of this setting"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Value & Configuration */}
        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Value & Configuration</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dataType">Data Type</Label>
              <Select
                name="dataType"
                value={dataType}
                onValueChange={(value) => setDataType(value as 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON' | 'DATE')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STRING">String</SelectItem>
                  <SelectItem value="NUMBER">Number</SelectItem>
                  <SelectItem value="BOOLEAN">Boolean</SelectItem>
                  <SelectItem value="JSON">JSON</SelectItem>
                  <SelectItem value="DATE">Date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">
                Value <span className="text-red-500">*</span>
              </Label>
              {dataType === 'JSON' ? (
                <Textarea
                  id="value"
                  name="value"
                  defaultValue={setting?.value}
                  placeholder='{"key": "value"}'
                  rows={5}
                  required
                />
              ) : (
                <Input
                  id="value"
                  name="value"
                  type={dataType === 'NUMBER' ? 'number' : dataType === 'DATE' ? 'date' : 'text'}
                  defaultValue={setting?.value}
                  placeholder={
                    dataType === 'BOOLEAN' ? 'true or false' :
                    dataType === 'NUMBER' ? '0' :
                    'Value'
                  }
                  required
                />
              )}
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isPublic">Public</Label>
                  <p className="text-sm text-muted-foreground">
                    Can be accessed by frontend
                  </p>
                </div>
                <Switch
                  id="isPublic"
                  name="isPublic"
                  defaultChecked={setting?.isPublic ?? false}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isEditable">Editable</Label>
                  <p className="text-sm text-muted-foreground">
                    Can be edited by admins
                  </p>
                </div>
                <Switch
                  id="isEditable"
                  name="isEditable"
                  defaultChecked={setting?.isEditable ?? true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
