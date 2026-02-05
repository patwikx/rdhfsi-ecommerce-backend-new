'use client';

import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, Package, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { OrderStatus } from '@prisma/client';

type OrderTimelineProps = {
  order: {
    status: OrderStatus;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
    shippedAt: Date | null;
    cancelledAt: Date | null;
  };
};

export function OrderTimeline({ order }: OrderTimelineProps) {
  const events = [
    {
      label: 'Order Placed',
      date: order.createdAt,
      icon: Package,
      color: 'text-blue-600',
      completed: true,
    },
    {
      label: 'Order Shipped',
      date: order.shippedAt,
      icon: Truck,
      color: 'text-purple-600',
      completed: !!order.shippedAt,
    },
    {
      label: order.cancelledAt ? 'Order Cancelled' : 'Order Delivered',
      date: order.cancelledAt || order.completedAt,
      icon: order.cancelledAt ? XCircle : CheckCircle,
      color: order.cancelledAt ? 'text-red-600' : 'text-green-600',
      completed: !!(order.cancelledAt || order.completedAt),
    },
  ];

  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold mb-4">Order Timeline</h3>
      <div className="space-y-4">
        {events.map((event, index) => {
          const Icon = event.icon;
          return (
            <div key={index} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`rounded-full p-2 ${
                    event.completed ? 'bg-primary/10' : 'bg-muted'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      event.completed ? event.color : 'text-muted-foreground'
                    }`}
                  />
                </div>
                {index < events.length - 1 && (
                  <div
                    className={`w-0.5 h-8 ${
                      event.completed ? 'bg-primary/20' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
              <div className="flex-1 pb-4">
                <p
                  className={`font-medium ${
                    event.completed ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {event.label}
                </p>
                {event.date && (
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(event.date), 'MMM dd, yyyy HH:mm')}
                  </p>
                )}
                {!event.date && event.completed && (
                  <p className="text-sm text-muted-foreground">Pending</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
