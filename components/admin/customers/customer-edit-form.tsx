'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateCustomer } from '@/app/actions/customer-actions';
import { toast } from 'sonner';
import {
  Loader2,
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  FileText,
  CreditCard,
  Calendar,
  Shield,
} from 'lucide-react';
import type { CustomerDetails } from '@/app/actions/customer-actions';
import { UserRole } from '@prisma/client';

type CustomerEditFormProps = {
  customer: CustomerDetails;
  userRole: string;
  onCancel?: () => void;
};

export function CustomerEditForm({ customer, userRole, onCancel }: CustomerEditFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      alternativePhone: formData.get('alternativePhone') as string,
      streetAddress: formData.get('streetAddress') as string,
      city: formData.get('city') as string,
      province: formData.get('province') as string,
      postalCode: formData.get('postalCode') as string,
      companyName: formData.get('companyName') as string,
      taxId: formData.get('taxId') as string,
      creditLimit: formData.get('creditLimit')
        ? parseFloat(formData.get('creditLimit') as string)
        : undefined,
      paymentTerms: formData.get('paymentTerms')
        ? parseInt(formData.get('paymentTerms') as string)
        : undefined,
      role: formData.get('role') as UserRole,
      isActive: formData.get('isActive') === 'true',
    };

    const result = await updateCustomer(customer.id, data);

    if (result.success) {
      toast.success('Customer updated successfully');
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to update customer');
    }

    setIsSubmitting(false);
  };

  const canEditRole = ['ADMIN'].includes(userRole);

  return (
    <form id="customer-edit-form" onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information - Full Width on Top */}
        <div className="lg:col-span-2 border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={customer.name || ''}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email <span className="text-red-500">*</span> (Read-only)
              </Label>
              <Input
                id="email"
                defaultValue={customer.email}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone
              </Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={customer.phone || ''}
                placeholder="+63 912 345 6789"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alternativePhone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Alternative Phone
              </Label>
              <Input
                id="alternativePhone"
                name="alternativePhone"
                defaultValue={customer.alternativePhone || ''}
                placeholder="+63 912 345 6789"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Address</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="streetAddress" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Street Address
              </Label>
              <Input
                id="streetAddress"
                name="streetAddress"
                defaultValue={customer.streetAddress || ''}
                placeholder="123 Main Street"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  City
                </Label>
                <Input
                  id="city"
                  name="city"
                  defaultValue={customer.city || ''}
                  placeholder="Manila"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="province" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Province
                </Label>
                <Input
                  id="province"
                  name="province"
                  defaultValue={customer.province || ''}
                  placeholder="Metro Manila"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Postal Code
              </Label>
              <Input
                id="postalCode"
                name="postalCode"
                defaultValue={customer.postalCode || ''}
                placeholder="1000"
              />
            </div>
          </div>
        </div>

        {/* Business Information & Account Settings */}
        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Business & Account Settings</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-4 space-y-2">
              <Label htmlFor="companyName" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Company Name
              </Label>
              <Input
                id="companyName"
                name="companyName"
                defaultValue={customer.companyName || ''}
                placeholder="Acme Corporation"
              />
            </div>
            <div className="col-span-4 space-y-2">
              <Label htmlFor="taxId" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Tax ID / Business Registration
              </Label>
              <Input
                id="taxId"
                name="taxId"
                defaultValue={customer.taxId || ''}
                placeholder="123-456-789-000"
              />
            </div>
            <div className="col-span-1 space-y-2">
              <Label htmlFor="creditLimit" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Credit Limit (PHP)
              </Label>
              <Input
                id="creditLimit"
                name="creditLimit"
                type="number"
                step="0.01"
                defaultValue={customer.creditLimit || ''}
                placeholder="50000.00"
              />
            </div>
            <div className="col-span-1 space-y-2">
              <Label htmlFor="paymentTerms" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Payment Terms (Days)
              </Label>
              <Input
                id="paymentTerms"
                name="paymentTerms"
                type="number"
                defaultValue={customer.paymentTerms || ''}
                placeholder="30"
              />
            </div>
            <div className="col-span-1 space-y-2">
              <Label htmlFor="role" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Customer Type <span className="text-red-500">*</span>
              </Label>
              <Select
                name="role"
                defaultValue={customer.role}
                disabled={!canEditRole}
                required
              >
                <SelectTrigger id="role" className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTOMER">Customer</SelectItem>
                  <SelectItem value="CORPORATE">Corporate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1 space-y-2">
              <Label htmlFor="isActive" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Status <span className="text-red-500">*</span>
              </Label>
              <Select
                name="isActive"
                defaultValue={customer.isActive ? 'true' : 'false'}
                required
              >
                <SelectTrigger id="isActive" className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
