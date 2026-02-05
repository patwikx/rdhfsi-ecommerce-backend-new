'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Package, CreditCard, Truck } from 'lucide-react';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { updateOrderStatus, updatePaymentStatus, addTrackingNumber, updateInternalNotes } from '@/app/actions/order-actions';

type OrderActionsProps = {
  order: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    trackingNumber: string | null;
    internalNotes: string | null;
  };
  userRole: string;
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

export function OrderActions({ order, userRole }: OrderActionsProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [trackingNum, setTrackingNum] = useState(order.trackingNumber || '');
  const [notes, setNotes] = useState(order.internalNotes || '');

  const canManage = ['ADMIN', 'MANAGER'].includes(userRole);

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    if (!canManage) {
      toast.error('You do not have permission to update order status');
      return;
    }

    setIsUpdating(true);
    try {
      const result = await updateOrderStatus(order.id, newStatus);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success(`Order status updated to ${newStatus}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePaymentUpdate = async (newStatus: PaymentStatus) => {
    if (!canManage) {
      toast.error('You do not have permission to update payment status');
      return;
    }

    setIsUpdating(true);
    try {
      const result = await updatePaymentStatus(order.id, newStatus);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success(`Payment status updated to ${newStatus}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update payment');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddTracking = async () => {
    if (!trackingNum.trim()) {
      toast.error('Please enter a tracking number');
      return;
    }

    setIsUpdating(true);
    try {
      const result = await addTrackingNumber(order.id, trackingNum);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success('Tracking number added and order marked as shipped');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add tracking');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    setIsUpdating(true);
    try {
      const result = await updateInternalNotes(order.id, notes);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success('Internal notes updated');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update notes');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Order & Payment Status */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Status Management</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Order Status */}
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Order Status</p>
              <Badge 
                variant={
                  order.status === 'DELIVERED' ? 'default' :
                  order.status === 'CANCELLED' ? 'destructive' :
                  order.status === 'PENDING' ? 'secondary' :
                  'outline'
                }
              >
                {order.status}
              </Badge>
            </div>
            
            {canManage && (
              <div className="space-y-2">
                <Label>Update Status</Label>
                <Select
                  value={order.status}
                  onValueChange={(value) => handleStatusUpdate(value as OrderStatus)}
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-yellow-600" />
                        Pending
                      </span>
                    </SelectItem>
                    <SelectItem value="CONFIRMED">
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-600" />
                        Confirmed
                      </span>
                    </SelectItem>
                    <SelectItem value="PROCESSING">
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-orange-600" />
                        Processing
                      </span>
                    </SelectItem>
                    <SelectItem value="SHIPPED">
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-purple-600" />
                        Shipped
                      </span>
                    </SelectItem>
                    <SelectItem value="DELIVERED">
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-green-600" />
                        Delivered
                      </span>
                    </SelectItem>
                    <SelectItem value="CANCELLED">
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-red-600" />
                        Cancelled
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Payment Status */}
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Payment Status</p>
              <Badge 
                variant={
                  order.paymentStatus === 'PAID' ? 'default' :
                  order.paymentStatus === 'FAILED' ? 'destructive' :
                  order.paymentStatus === 'PENDING' ? 'secondary' :
                  'outline'
                }
              >
                {order.paymentStatus}
              </Badge>
            </div>
            
            {canManage && (
              <div className="space-y-2">
                <Label>Update Payment</Label>
                <Select
                  value={order.paymentStatus}
                  onValueChange={(value) => handlePaymentUpdate(value as PaymentStatus)}
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-yellow-600" />
                        Pending
                      </span>
                    </SelectItem>
                    <SelectItem value="PAID">
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-green-600" />
                        Paid
                      </span>
                    </SelectItem>
                    <SelectItem value="FAILED">
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-red-600" />
                        Failed
                      </span>
                    </SelectItem>
                    <SelectItem value="REFUNDED">
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-gray-600" />
                        Refunded
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tracking Number */}
      {!order.trackingNumber && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Add Tracking</h3>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="tracking">Tracking Number</Label>
              <Input
                id="tracking"
                placeholder="Enter tracking number"
                value={trackingNum}
                onChange={(e) => setTrackingNum(e.target.value)}
                disabled={isUpdating}
              />
            </div>
            <Button
              onClick={handleAddTracking}
              disabled={isUpdating || !trackingNum.trim()}
              className="w-full"
            >
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Truck className="mr-2 h-4 w-4" />
              Add & Mark as Shipped
            </Button>
          </div>
        </div>
      )}

      {/* Internal Notes */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Internal Notes</h3>
        <div className="space-y-3">
          <Textarea
            placeholder="Add internal notes (not visible to customer)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            disabled={isUpdating}
          />
          <Button
            onClick={handleSaveNotes}
            disabled={isUpdating}
            variant="outline"
            className="w-full"
          >
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Notes
          </Button>
        </div>
      </div>
    </div>
  );
}
