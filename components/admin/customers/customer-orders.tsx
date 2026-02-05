'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ExternalLink, Package } from 'lucide-react';
import { format } from 'date-fns';
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

type CustomerOrdersProps = {
  orders: CustomerOrder[];
};

export function CustomerOrders({ orders }: CustomerOrdersProps) {
  const getStatusBadge = (status: OrderStatus) => {
    const variants: Record<
      OrderStatus,
      { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }
    > = {
      PENDING: { variant: 'outline', label: 'Pending' },
      CONFIRMED: { variant: 'secondary', label: 'Confirmed' },
      PROCESSING: { variant: 'default', label: 'Processing' },
      SHIPPED: { variant: 'default', label: 'Shipped' },
      DELIVERED: { variant: 'secondary', label: 'Delivered' },
      CANCELLED: { variant: 'destructive', label: 'Cancelled' },
      REFUNDED: { variant: 'outline', label: 'Refunded' },
    };
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentBadge = (status: PaymentStatus) => {
    const variants: Record<
      PaymentStatus,
      { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }
    > = {
      PENDING: { variant: 'outline', label: 'Pending' },
      PAID: { variant: 'secondary', label: 'Paid' },
      FAILED: { variant: 'destructive', label: 'Failed' },
      REFUNDED: { variant: 'outline', label: 'Refunded' },
      PARTIALLY_REFUNDED: { variant: 'outline', label: 'Partial Refund' },
    };
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  if (orders.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center">
        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Orders Yet</h3>
        <p className="text-muted-foreground">
          This customer hasn't placed any orders yet.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order Number</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>
                <div className="font-medium">{order.orderNumber}</div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(order.createdAt), 'MMM dd, yyyy')}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(order.createdAt), 'HH:mm')}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <span>{order._count.items} items</span>
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(order.status)}</TableCell>
              <TableCell>{getPaymentBadge(order.paymentStatus)}</TableCell>
              <TableCell className="text-right">
                <div className="font-semibold">{formatCurrency(order.totalAmount)}</div>
              </TableCell>
              <TableCell className="text-right">
                <Link href={`/admin/orders/${order.id}`}>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <ExternalLink className="w-4 h-4" />
                    View
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
