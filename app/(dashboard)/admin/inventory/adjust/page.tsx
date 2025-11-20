import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { StockAdjustmentForm } from '@/components/admin/inventory/stock-adjustment-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Stock Adjustment | Admin',
  description: 'Adjust inventory stock levels',
};

async function getInventoryItem(inventoryId: string) {
  const inventory = await prisma.inventory.findUnique({
    where: { id: inventoryId },
    include: {
      product: {
        select: {
          id: true,
          sku: true,
          name: true,
          baseUom: true,
          category: {
            select: {
              name: true,
            },
          },
        },
      },
      site: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  });

  if (!inventory) return null;

  // Convert Decimal to number
  return {
    ...inventory,
    quantity: Number(inventory.quantity),
    reservedQty: Number(inventory.reservedQty),
    availableQty: Number(inventory.availableQty),
    minStockLevel: inventory.minStockLevel ? Number(inventory.minStockLevel) : null,
    maxStockLevel: inventory.maxStockLevel ? Number(inventory.maxStockLevel) : null,
    reorderPoint: inventory.reorderPoint ? Number(inventory.reorderPoint) : null,
  };
}

async function getRecentMovements(inventoryId: string) {
  const movements = await prisma.inventoryMovement.findMany({
    where: { inventoryId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // Get user details for movements that have performedBy
  const movementsWithUsers = await Promise.all(
    movements.map(async (movement) => {
      if (movement.performedBy) {
        const user = await prisma.user.findUnique({
          where: { id: movement.performedBy },
          select: { name: true, email: true },
        });
        return { ...movement, user };
      }
      return { ...movement, user: null };
    })
  );

  return movementsWithUsers;
}

export default async function StockAdjustmentPage({
  searchParams,
}: {
  searchParams: Promise<{ inventoryId?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  if (!session || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  if (!params.inventoryId) {
    redirect('/admin/inventory');
  }

  const [inventory, recentMovements] = await Promise.all([
    getInventoryItem(params.inventoryId),
    getRecentMovements(params.inventoryId),
  ]);

  if (!inventory) {
    redirect('/admin/inventory');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/inventory">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Adjustment</h1>
          <p className="text-muted-foreground">
            Adjust inventory levels for {inventory.product.name}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Adjustment Details</CardTitle>
              <CardDescription>
                Make adjustments to inventory quantity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StockAdjustmentForm inventory={inventory} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Current Stock Info */}
          <Card>
            <CardHeader>
              <CardTitle>Current Stock</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Product</div>
                <div className="font-semibold">{inventory.product.name}</div>
                <div className="text-sm text-muted-foreground font-mono">
                  {inventory.product.sku}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Category</div>
                <div className="font-medium">{inventory.product.category.name}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Site</div>
                <div className="font-medium">
                  {inventory.site.name} ({inventory.site.code})
                </div>
              </div>
              <div className="pt-4 border-t">
                <div className="text-sm text-muted-foreground">Total Quantity</div>
                <div className="text-2xl font-bold">
                  {inventory.quantity} {inventory.product.baseUom}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Reserved</div>
                <div className="text-lg font-semibold">
                  {inventory.reservedQty} {inventory.product.baseUom}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Available</div>
                <div className="text-lg font-semibold text-green-600">
                  {inventory.availableQty} {inventory.product.baseUom}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Movements */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Last 10 movements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentMovements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                ) : (
                  recentMovements.map((movement: any) => (
                    <div key={movement.id} className="text-sm border-b pb-2 last:border-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium capitalize">
                            {movement.movementType.toLowerCase().replace('_', ' ')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {movement.user?.name || movement.user?.email || 'System'}
                          </div>
                        </div>
                        <div className={`font-semibold ${
                          Number(movement.quantityChange) > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {Number(movement.quantityChange) > 0 ? '+' : ''}{Number(movement.quantityChange)}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(movement.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
