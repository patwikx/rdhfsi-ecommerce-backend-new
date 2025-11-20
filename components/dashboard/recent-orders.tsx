'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { MoreHorizontal, CheckCircle2, Clock, XCircle, Loader2, TrendingUp, Package, Settings, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { getRecentOrders, getTopProducts, getFrequentlyBoughtTogether } from '@/app/actions/dashboard-actions';
import { useCurrentSite } from '@/hooks/use-current-site';
import Image from 'next/image';

type Order = {
  id: string;
  orderNumber: string;
  customer: string;
  status: string;
  total: number;
  items: number;
  date: Date;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  image: string | null;
  unitsSold: number;
  revenue: number;
  price: number;
};

type ProductPair = {
  product1: {
    id: string;
    name: string;
    sku: string;
    image: string | null;
  };
  product2: {
    id: string;
    name: string;
    sku: string;
    image: string | null;
  };
  timesBoughtTogether: number;
  confidence: number;
};

const statusConfig = {
  PENDING: {
    label: 'In Process',
    icon: Clock,
    color: 'text-muted-foreground',
  },
  CONFIRMED: {
    label: 'Done',
    icon: CheckCircle2,
    color: 'text-emerald-500 dark:text-emerald-400',
  },
  PROCESSING: {
    label: 'In Process',
    icon: Clock,
    color: 'text-muted-foreground',
  },
  SHIPPED: {
    label: 'Done',
    icon: CheckCircle2,
    color: 'text-emerald-500 dark:text-emerald-400',
  },
  DELIVERED: {
    label: 'Done',
    icon: CheckCircle2,
    color: 'text-emerald-500 dark:text-emerald-400',
  },
  CANCELLED: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'text-red-500 dark:text-red-400',
  },
};

export function RecentOrders() {
  const { siteId } = useCurrentSite();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productPairs, setProductPairs] = useState<ProductPair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders');

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      
      const [ordersResult, productsResult, pairsResult] = await Promise.all([
        getRecentOrders(10),
        getTopProducts(10),
        getFrequentlyBoughtTogether(10),
      ]);

      if (ordersResult.success && ordersResult.data) {
        setOrders(ordersResult.data);
      }
      if (productsResult.success && productsResult.data) {
        setProducts(productsResult.data);
      }
      if (pairsResult.success && pairsResult.data) {
        setProductPairs(pairsResult.data);
      }
      
      setIsLoading(false);
    }

    fetchData();
  }, [siteId]);

  return (
    <Tabs defaultValue="orders" className="w-full" onValueChange={setActiveTab}>
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="orders">
            Recent Orders
          </TabsTrigger>
          <TabsTrigger value="products">
            Top Selling Products
            <Badge variant="secondary" className="ml-2">
              {products.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="pairs">
            Frequently Bought Together
            <Badge variant="secondary" className="ml-2">
              {productPairs.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Customize Columns
          </Button>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>
        </div>
      </div>

      <TabsContent value="orders" className="mt-4">
        {isLoading ? (
          <div className="flex items-center justify-center p-12 border rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox />
                  </TableHead>
                  <TableHead>Order Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No recent orders
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => {
                    const statusInfo = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.PENDING;
                    const StatusIcon = statusInfo.icon;

                    return (
                      <TableRow key={order.id} className="group">
                        <TableCell>
                          <div className="flex items-center justify-center">
                            <span className="text-muted-foreground group-hover:hidden">::</span>
                            <div className="hidden group-hover:block">
                              <Checkbox />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>{order.customer}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <StatusIcon className={`h-3 w-3 ${statusInfo.color}`} />
                            <span className={statusInfo.color}>{statusInfo.label}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ₱{order.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {order.items}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>Update Status</DropdownMenuItem>
                              <DropdownMenuItem>Print Invoice</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="products" className="mt-4">
        {isLoading ? (
          <div className="flex items-center justify-center p-12 border rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox />
                  </TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Units Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No product data available
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id} className="group">
                      <TableCell>
                        <div className="flex items-center justify-center">
                          <span className="text-muted-foreground group-hover:hidden">::</span>
                          <div className="hidden group-hover:block">
                            <Checkbox />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-muted">
                            {product.image ? (
                              <Image src={product.image} alt={product.name} fill className="object-cover" />
                            ) : (
                              <div className="flex items-center justify-center w-full h-full">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-xs text-muted-foreground">{product.sku}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{product.category || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="font-medium">{product.unitsSold}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₱{product.revenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Product</DropdownMenuItem>
                            <DropdownMenuItem>View Analytics</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="pairs" className="mt-4">
        {isLoading ? (
          <div className="flex items-center justify-center p-12 border rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox />
                  </TableHead>
                  <TableHead>Product 1</TableHead>
                  <TableHead>Product 2</TableHead>
                  <TableHead className="text-right">Times Bought</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productPairs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No product pair data available
                    </TableCell>
                  </TableRow>
                ) : (
                  productPairs.map((pair) => (
                    <TableRow key={`${pair.product1.id}-${pair.product2.id}`} className="group">
                      <TableCell>
                        <div className="flex items-center justify-center">
                          <span className="text-muted-foreground group-hover:hidden">::</span>
                          <div className="hidden group-hover:block">
                            <Checkbox />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-muted">
                            {pair.product1.image ? (
                              <Image src={pair.product1.image} alt={pair.product1.name} fill className="object-cover" />
                            ) : (
                              <div className="flex items-center justify-center w-full h-full">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{pair.product1.name}</div>
                            <div className="text-xs text-muted-foreground">{pair.product1.sku}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-muted">
                            {pair.product2.image ? (
                              <Image src={pair.product2.image} alt={pair.product2.name} fill className="object-cover" />
                            ) : (
                              <div className="flex items-center justify-center w-full h-full">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{pair.product2.name}</div>
                            <div className="text-xs text-muted-foreground">{pair.product2.sku}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">{pair.timesBoughtTogether}x</div>
                        <div className="text-xs text-emerald-500">{pair.confidence.toFixed(0)}% confidence</div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem>Create Bundle</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
