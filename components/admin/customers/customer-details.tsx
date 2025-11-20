'use client';

import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  FileText,
  User,
  Package,
} from 'lucide-react';
import { format } from 'date-fns';
import type { CustomerDetails } from '@/app/actions/customer-actions';
import { UserRole } from '@prisma/client';

type Activity = {
  id: string;
  action: string;
  description: string | null;
  createdAt: Date;
};

type CustomerDetailsProps = {
  customer: CustomerDetails;
  activities?: Activity[];
};

export function CustomerDetailsCard({ customer, activities = [] }: CustomerDetailsProps) {
  const getRoleBadge = (role: UserRole) => {
    const variants: Record<
      UserRole,
      { variant: 'default' | 'secondary' | 'outline'; label: string }
    > = {
      CUSTOMER: { variant: 'default', label: 'Customer' },
      CORPORATE: { variant: 'secondary', label: 'Corporate' },
      ADMIN: { variant: 'outline', label: 'Admin' },
      MANAGER: { variant: 'outline', label: 'Manager' },
      STAFF: { variant: 'outline', label: 'Staff' },
    };
    const config = variants[role];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const getActivityIcon = (action: string) => {
    const icons: Record<string, React.ReactNode> = {
      LOGIN: <User className="w-4 h-4 text-green-600" />,
      LOGOUT: <User className="w-4 h-4 text-gray-600" />,
      VIEW_PRODUCT: <Package className="w-4 h-4 text-blue-600" />,
      ADD_TO_CART: <Package className="w-4 h-4 text-purple-600" />,
      PLACE_ORDER: <Package className="w-4 h-4 text-green-600" />,
      UPDATE_PROFILE: <User className="w-4 h-4 text-blue-600" />,
    };
    return icons[action] || <FileText className="w-4 h-4 text-gray-600" />;
  };

  const getActivityLabel = (action: string) => {
    const labels: Record<string, string> = {
      LOGIN: 'Logged in',
      LOGOUT: 'Logged out',
      VIEW_PRODUCT: 'Viewed product',
      ADD_TO_CART: 'Added to cart',
      PLACE_ORDER: 'Placed order',
      UPDATE_PROFILE: 'Updated profile',
    };
    return labels[action] || action.replace(/_/g, ' ').toLowerCase();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Info */}
      <div className="lg:col-span-2 space-y-6">
        <div className="border rounded-lg p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                {customer.companyName ? (
                  <Building2 className="w-8 h-8 text-primary" />
                ) : (
                  <User className="w-8 h-8 text-primary" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {customer.name || 'Unnamed Customer'}
                </h2>
                {customer.companyName && (
                  <p className="text-lg text-muted-foreground">
                    {customer.companyName}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  {getRoleBadge(customer.role)}
                  {customer.isActive ? (
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 border-green-200"
                    >
                      Active
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-gray-50 text-gray-700 border-gray-200"
                    >
                      Inactive
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Email</label>
                <p className="font-medium">{customer.email}</p>
              </div>
              {customer.phone && (
                <div>
                  <label className="text-sm text-muted-foreground">Phone</label>
                  <p className="font-medium">{customer.phone}</p>
                </div>
              )}
              {customer.alternativePhone && (
                <div>
                  <label className="text-sm text-muted-foreground">
                    Alternative Phone
                  </label>
                  <p className="font-medium">{customer.alternativePhone}</p>
                </div>
              )}
            </div>
          </div>

          {/* Address */}
          {(customer.streetAddress ||
            customer.city ||
            customer.province ||
            customer.postalCode) && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Address
              </h3>
              <div className="text-muted-foreground">
                {customer.streetAddress && <p>{customer.streetAddress}</p>}
                <p>
                  {[customer.city, customer.province, customer.postalCode]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>
            </div>
          )}

          {/* Business Information */}
          {(customer.taxId || customer.creditLimit || customer.paymentTerms) && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Business Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customer.taxId && (
                  <div>
                    <label className="text-sm text-muted-foreground">
                      Tax ID / Business Registration
                    </label>
                    <p className="font-medium">{customer.taxId}</p>
                  </div>
                )}
                {customer.creditLimit && (
                  <div>
                    <label className="text-sm text-muted-foreground">
                      Credit Limit
                    </label>
                    <p className="font-medium">
                      {formatCurrency(customer.creditLimit)}
                    </p>
                  </div>
                )}
                {customer.paymentTerms && (
                  <div>
                    <label className="text-sm text-muted-foreground">
                      Payment Terms
                    </label>
                    <p className="font-medium">Net {customer.paymentTerms} days</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="border rounded-lg p-6">
          <h3 className="font-semibold mb-4">Recent Activity</h3>
          {activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    {getActivityIcon(activity.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{getActivityLabel(activity.action)}</p>
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(activity.createdAt), 'MMM dd, HH:mm')}
                      </span>
                    </div>
                    {activity.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {activity.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No activity recorded yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Customer activity will appear here once they start using the platform
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Sidebar */}
      <div className="space-y-4">
        <div className="border rounded-lg p-6">
          <h3 className="font-semibold mb-4">Account Statistics</h3>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">
                Total Orders
              </div>
              <div className="text-2xl font-bold">{customer._count.orders}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">
                Saved Addresses
              </div>
              <div className="text-2xl font-bold">
                {customer._count.addresses}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Reviews</div>
              <div className="text-2xl font-bold">{customer._count.reviews}</div>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Account Dates
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-muted-foreground">Member Since</div>
              <div className="font-medium">
                {format(new Date(customer.createdAt), 'MMMM dd, yyyy')}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Last Updated</div>
              <div className="font-medium">
                {format(new Date(customer.updatedAt), 'MMMM dd, yyyy')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
