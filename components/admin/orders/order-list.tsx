'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Eye, Package } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { OrderStatus, PaymentStatus, FulfillmentStatus } from '@prisma/client';

type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  totalAmount: number;
  createdAt: Date;
  items: {
    id: string;
    quantity: number;
    productName: string;
  }[];
};

type OrderListProps = {
  orders: Order[];
  userRole: string;
  currentFilters: {
    status?: string;
    paymentStatus?: string;
    search?: string;
  };
};

const getOrderStatusVariant = (status: OrderStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (status === 'DELIVERED') return 'default';
  if (status === 'CANCELLED') return 'destructive';
  if (status === 'PENDING') return 'secondary';
  return 'outline';
};

const getPaymentStatusVariant = (status: PaymentStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (status === 'PAID') return 'default';
  if (status === 'FAILED') return 'destructive';
  if (status === 'PENDING') return 'secondary';
  return 'outline';
};

const getStatusBulletColor = (status: OrderStatus): string => {
  switch (status) {
    case 'PENDING': return 'bg-yellow-600';
    case 'CONFIRMED': return 'bg-blue-600';
    case 'PROCESSING': return 'bg-orange-600';
    case 'SHIPPED': return 'bg-purple-600';
    case 'DELIVERED': return 'bg-green-600';
    case 'CANCELLED': return 'bg-red-600';
    default: return 'bg-gray-600';
  }
};

const getPaymentBulletColor = (status: PaymentStatus): string => {
  switch (status) {
    case 'PENDING': return 'bg-yellow-600';
    case 'PAID': return 'bg-green-600';
    case 'FAILED': return 'bg-red-600';
    default: return 'bg-gray-600';
  }
};

export function OrderList({ orders, userRole, currentFilters }: OrderListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(currentFilters.search || '');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const totalPages = Math.ceil(orders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = orders.slice(startIndex, endIndex);

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setCurrentPage(1);
    router.push(`/admin/orders?${params.toString()}`);
  };

  const handleSearch = () => {
    updateFilters('search', searchTerm);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number, customer name, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9"
          />
        </div>
        <Select
          value={currentFilters.status || 'all'}
          onValueChange={(value) => updateFilters('status', value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Order Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="PROCESSING">Processing</SelectItem>
            <SelectItem value="SHIPPED">Shipped</SelectItem>
            <SelectItem value="DELIVERED">Delivered</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={currentFilters.paymentStatus || 'all'}
          onValueChange={(value) => updateFilters('paymentStatus', value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Payment Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Order Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No orders found</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="font-mono font-semibold">{order.orderNumber}</div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{order.customerName}</div>
                      <div className="text-sm text-muted-foreground">{order.customerEmail}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(order.totalAmount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getOrderStatusVariant(order.status)}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPaymentStatusVariant(order.paymentStatus)}>
                      {order.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(order.createdAt), 'MMM dd, yyyy')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(order.createdAt), 'HH:mm')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <Link href={`/admin/orders/${order.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, orders.length)} of {orders.length} orders
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              <Button
                variant={currentPage === 1 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPage(1)}
                className="w-9"
              >
                1
              </Button>

              {currentPage > 3 && (
                <span className="px-2 text-muted-foreground">...</span>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  if (page === 1 || page === totalPages) return false;
                  return Math.abs(page - currentPage) <= 1;
                })
                .map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-9"
                  >
                    {page}
                  </Button>
                ))}

              {currentPage < totalPages - 2 && (
                <span className="px-2 text-muted-foreground">...</span>
              )}

              {totalPages > 1 && (
                <Button
                  variant={currentPage === totalPages ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  className="w-9"
                >
                  {totalPages}
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
