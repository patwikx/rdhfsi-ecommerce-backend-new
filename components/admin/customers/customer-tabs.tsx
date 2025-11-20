'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { CustomerDetailsCard } from './customer-details';
import { CustomerOrders } from './customer-orders';
import { CustomerEditForm } from './customer-edit-form';
import type { CustomerDetails } from '@/app/actions/customer-actions';
import { OrderStatus, PaymentStatus } from '@prisma/client';

type CustomerOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  createdAt: Date;
  _count: {
    items: number;
  };
};

type Activity = {
  id: string;
  action: string;
  description: string | null;
  createdAt: Date;
};

type CustomerTabsProps = {
  customer: CustomerDetails;
  orders: CustomerOrder[];
  activities: Activity[];
  userRole: string;
};

export function CustomerTabs({ customer, orders, activities, userRole }: CustomerTabsProps) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
          <TabsTrigger value="edit">Edit Information</TabsTrigger>
        </TabsList>

        {activeTab === 'edit' && (
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveTab('overview')}
              form="customer-edit-form"
            >
              Cancel
            </Button>
            <Button type="submit" form="customer-edit-form">
              Save Changes
            </Button>
          </div>
        )}
      </div>

      <TabsContent value="overview">
        <CustomerDetailsCard customer={customer} activities={activities} />
      </TabsContent>

      <TabsContent value="orders">
        <CustomerOrders orders={orders} />
      </TabsContent>

      <TabsContent value="edit">
        <CustomerEditForm
          customer={customer}
          userRole={userRole}
          onCancel={() => setActiveTab('overview')}
        />
      </TabsContent>
    </Tabs>
  );
}
