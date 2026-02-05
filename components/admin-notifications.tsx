'use client';

import { useState, useEffect } from 'react';
import { Bell, ShoppingCart, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { getAdminNotifications } from '@/app/actions/notification-actions';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

type AdminNotifications = {
  newOrders: {
    id: string;
    orderNumber: string;
    customerName: string;
    total: number;
    createdAt: Date;
  }[];
  newQuotes: {
    id: string;
    quoteNumber: string;
    customerName: string;
    status: string;
    createdAt: Date;
  }[];
  totalCount: number;
};

export function AdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotifications | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const result = await getAdminNotifications();
      if (result.success && result.data) {
        setNotifications(result.data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const totalCount = notifications?.totalCount || 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {totalCount > 9 ? '9+' : totalCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b p-4">
          <h3 className="font-semibold">Notifications</h3>
          <p className="text-xs text-muted-foreground">
            New orders and quotations from the last 24 hours
          </p>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : totalCount === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">No new notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {/* New Orders */}
              {notifications?.newOrders && notifications.newOrders.length > 0 && (
                <div className="p-2">
                  <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                    <ShoppingCart className="h-3 w-3" />
                    New Orders ({notifications.newOrders.length})
                  </div>
                  {notifications.newOrders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/admin/orders/${order.id}`}
                      onClick={() => setIsOpen(false)}
                      className="block p-2 hover:bg-muted rounded-md transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            Order #{order.orderNumber}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {order.customerName}
                          </p>
                          <p className="text-xs font-semibold text-green-600">
                            ₱{order.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* New Quotes */}
              {notifications?.newQuotes && notifications.newQuotes.length > 0 && (
                <div className="p-2">
                  <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    New Quotations ({notifications.newQuotes.length})
                  </div>
                  {notifications.newQuotes.map((quote) => (
                    <Link
                      key={quote.id}
                      href={`/admin/quotes/${quote.id}`}
                      onClick={() => setIsOpen(false)}
                      className="block p-2 hover:bg-muted rounded-md transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            Quote #{quote.quoteNumber}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {quote.customerName}
                          </p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {quote.status}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(quote.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {totalCount > 0 && (
          <div className="border-t p-2">
            <Link
              href="/admin/orders"
              onClick={() => setIsOpen(false)}
              className="block text-center text-sm text-primary hover:underline py-2"
            >
              View All Orders
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
