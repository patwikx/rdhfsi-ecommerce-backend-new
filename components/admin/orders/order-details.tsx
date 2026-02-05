'use client';

import React, { useState } from 'react';
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
import { Package, MapPin, CreditCard, FileText, Download, Loader2, ExternalLink } from 'lucide-react';
import { OrderStatus, PaymentStatus, FulfillmentStatus } from '@prisma/client';
import { toast } from 'sonner';

type OrderDetailsProps = {
  order: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    fulfillmentStatus: FulfillmentStatus;
    subtotal: number;
    taxAmount: number;
    shippingAmount: number;
    discountAmount: number;
    totalAmount: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    companyName: string | null;
    shippingMethod: string | null;
    trackingNumber: string | null;
    paymentMethod: string | null;
    paymentDetails: unknown;
    poNumber: string | null;
    notes: string | null;
    items: {
      id: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      productName: string;
      productSku: string;
      productBarcode: string;
    }[];
    shippingAddress: {
      fullName: string;
      phone: string;
      addressLine1: string;
      addressLine2: string | null;
      city: string;
      province: string;
      postalCode: string | null;
    } | null;
  };
};

const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  CONFIRMED: 'bg-blue-100 text-blue-800 border-blue-200',
  PROCESSING: 'bg-orange-100 text-orange-800 border-orange-200',
  SHIPPED: 'bg-purple-100 text-purple-800 border-purple-200',
  DELIVERED: 'bg-green-100 text-green-800 border-green-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200',
  REFUNDED: 'bg-gray-100 text-gray-800 border-gray-200',
};

const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
  PARTIALLY_REFUNDED: 'bg-orange-100 text-orange-800',
};

export function OrderDetails({ order }: OrderDetailsProps): React.ReactElement {
  const [loadingFile, setLoadingFile] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  // Extract attachments from paymentDetails
  const getAttachments = (): { url: string; label: string }[] => {
    if (!order.paymentDetails) return [];
    
    const attachments: { url: string; label: string }[] = [];
    
    try {
      const details = order.paymentDetails as any;
      
      // Check for poFileUrl (PO attachment)
      if (details.poFileUrl && typeof details.poFileUrl === 'string') {
        attachments.push({ url: details.poFileUrl, label: 'Purchase Order (PO)' });
      }
      
      // Check for attachments array (legacy format)
      if (details.attachments && Array.isArray(details.attachments)) {
        details.attachments.forEach((url: any, index: number) => {
          if (typeof url === 'string') {
            attachments.push({ url, label: `Attachment ${index + 1}` });
          }
        });
      }
    } catch (error) {
      console.error('Error parsing payment details:', error);
    }
    
    return attachments;
  };

  const attachments = getAttachments();

  // Handle viewing file with fresh presigned URL
  const handleViewFile = async (originalUrl: string, label: string) => {
    setLoadingFile(originalUrl);
    try {
      const response = await fetch(`/api/files/presigned-url?url=${encodeURIComponent(originalUrl)}`);
      const data = await response.json();
      
      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        toast.error('Failed to get file URL');
      }
    } catch (error) {
      console.error('Error getting presigned URL:', error);
      toast.error('Failed to open file');
    } finally {
      setLoadingFile(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Attachments - Show prominently at top if exists */}
      {attachments.length > 0 && (
        <div className="border rounded-lg p-4 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold">Attachments</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleViewFile(attachment.url, attachment.label)}
                disabled={loadingFile === attachment.url}
                className="gap-2"
              >
                {loadingFile === attachment.url ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                {attachment.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Order Items */}
      <div className="border rounded-lg">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Order Items</h2>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{item.productName}</div>
                    <div className="text-sm text-muted-foreground">
                      SKU: {item.productSku}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.unitPrice)}
                </TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(item.subtotal)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {/* Order Totals */}
        <div className="p-4 border-t bg-muted/50">
          <div className="space-y-2 max-w-sm ml-auto">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatCurrency(order.taxAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span>{formatCurrency(order.shippingAmount)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total</span>
              <span>{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer & Shipping Information */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Shipping Address */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-5 w-5" />
            <h3 className="font-semibold">Shipping Address</h3>
          </div>
          {order.shippingAddress ? (
            <div className="space-y-1 text-sm">
              <p className="font-medium">{order.shippingAddress.fullName}</p>
              <p className="text-muted-foreground">{order.shippingAddress.phone}</p>
              <p className="text-muted-foreground">{order.shippingAddress.addressLine1}</p>
              {order.shippingAddress.addressLine2 && (
                <p className="text-muted-foreground">{order.shippingAddress.addressLine2}</p>
              )}
              <p className="text-muted-foreground">
                {order.shippingAddress.city}, {order.shippingAddress.province}
                {order.shippingAddress.postalCode ? ` ${order.shippingAddress.postalCode}` : ''}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No shipping address</p>
          )}

          {order.shippingMethod && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-sm text-muted-foreground">Shipping Method</p>
              <p className="font-medium">{order.shippingMethod}</p>
            </div>
          )}

          {order.trackingNumber && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-sm text-muted-foreground">Tracking Number</p>
              <p className="font-mono font-medium">{order.trackingNumber}</p>
            </div>
          )}
        </div>

        {/* Payment & Customer Info */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="h-5 w-5" />
            <h3 className="font-semibold">Payment & Customer</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-medium">{order.customerName}</p>
              <p className="text-sm text-muted-foreground">{order.customerEmail}</p>
              <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
              {order.companyName && (
                <p className="text-sm font-medium mt-1">{order.companyName}</p>
              )}
            </div>

            <div className='grid grid-cols-2'>
<div className="pt-3 border-t">
              <p className="text-sm text-muted-foreground">Payment Status</p>
              <Badge className={PAYMENT_STATUS_COLORS[order.paymentStatus]}>
                {order.paymentStatus}
              </Badge>
            </div>

            {order.paymentMethod && (
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <p className="font-medium">{order.paymentMethod}</p>
              </div>
            )}

            </div>

            

            {order.poNumber && (
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground">PO Number</p>
                <p className="font-mono font-medium">{order.poNumber}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Notes */}
      {order.notes && (
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-5 w-5" />
            <h3 className="font-semibold">Customer Notes</h3>
          </div>
          <p className="text-sm text-muted-foreground">{order.notes}</p>
        </div>
      )}
    </div>
  );
}
