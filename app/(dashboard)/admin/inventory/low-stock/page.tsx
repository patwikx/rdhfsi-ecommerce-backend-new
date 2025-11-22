import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { LowStockList } from '@/components/admin/inventory/low-stock-list';
import { AlertTriangle } from 'lucide-react';

export const metadata = {
  title: 'Low Stock Alert | Admin',
  description: 'Monitor and manage low stock items',
};

async function getLowStockInventory(siteId?: string) {
  const inventoryData = await prisma.inventory.findMany({
    where: {
      ...(siteId && { siteId }),
      OR: [
        {
          AND: [
            { minStockLevel: { not: null } },
            { availableQty: { lte: prisma.inventory.fields.minStockLevel } },
          ],
        },
        {
          AND: [
            { reorderPoint: { not: null } },
            { availableQty: { lte: prisma.inventory.fields.reorderPoint } },
          ],
        },
      ],
    },
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
    orderBy: [
      { availableQty: 'asc' },
      { product: { name: 'asc' } },
    ],
  });

  // Convert Decimal to number
  return inventoryData.map(inv => ({
    ...inv,
    quantity: Number(inv.quantity),
    reservedQty: Number(inv.reservedQty),
    availableQty: Number(inv.availableQty),
    minStockLevel: inv.minStockLevel ? Number(inv.minStockLevel) : null,
    maxStockLevel: inv.maxStockLevel ? Number(inv.maxStockLevel) : null,
    reorderPoint: inv.reorderPoint ? Number(inv.reorderPoint) : null,
  }));
}

async function getSites() {
  return prisma.site.findMany({
    where: { isActive: true },
    select: {
      id: true,
      code: true,
      name: true,
    },
    orderBy: { name: 'asc' },
  });
}

export default async function LowStockPage({
  searchParams,
}: {
  searchParams: Promise<{ siteId?: string; critical?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  if (!session || !['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  const [inventory, sites] = await Promise.all([
    getLowStockInventory(params.siteId),
    getSites(),
  ]);

  // Calculate critical items (below 50% of min stock level)
  const criticalCount = inventory.filter(
    (inv) => inv.minStockLevel && inv.availableQty <= inv.minStockLevel * 0.5
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Low Stock Alert</h1>
        <p className="text-muted-foreground">
          Monitor items that need restocking
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-muted-foreground">Low Stock Items</div>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </div>
          <div className="text-2xl font-bold">{inventory.length}</div>
          <p className="text-xs text-muted-foreground">Items below minimum level</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-muted-foreground">Critical Items</div>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
          <p className="text-xs text-muted-foreground">Below 50% of minimum level</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-muted-foreground">Sites Affected</div>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </div>
          <div className="text-2xl font-bold">
            {new Set(inventory.map((inv) => inv.siteId)).size}
          </div>
          <p className="text-xs text-muted-foreground">Locations with low stock</p>
        </div>
      </div>

      {/* Low Stock List */}
      <Suspense fallback={<div>Loading...</div>}>
        <LowStockList
          inventory={inventory}
          sites={sites}
          userRole={session.user.role}
          currentFilters={{
            siteId: params.siteId,
            critical: params.critical === 'true',
          }}
        />
      </Suspense>
    </div>
  );
}
