import { getAllInventory } from '@/app/actions/inventory-actions';
import { InventoryList } from '@/components/admin/inventory/inventory-list';
import { Button } from '@/components/ui/button';
import { Package, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ siteId?: string; lowStock?: string; search?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  const [inventoryResult, sites] = await Promise.all([
    getAllInventory({
      siteId: params.siteId,
      lowStock: params.lowStock === 'true',
      search: params.search,
    }),
    prisma.site.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!inventoryResult.success) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">Error Loading Inventory</h2>
          <p className="text-muted-foreground">{inventoryResult.error}</p>
        </div>
      </div>
    );
  }

  const inventory = inventoryResult.data || [];

  // Calculate stats
  const totalItems = inventory.length;
  const totalStock = inventory.reduce((sum, inv) => sum + Number(inv.availableQty), 0);
  const lowStockCount = inventory.filter(
    (inv) => inv.minStockLevel !== null && inv.availableQty <= inv.minStockLevel
  ).length;
  const outOfStockCount = inventory.filter((inv) => inv.availableQty === 0).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventory Management</h1>
          <p className="text-muted-foreground">
            Manage stock levels across all sites
          </p>
        </div>
        <div className="flex items-center gap-2">
          {['ADMIN', 'MANAGER'].includes(session.user.role) && (
            <>
              <Button variant="outline" asChild>
                <Link href="/admin/inventory/transfer">
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Transfer Stock
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin/inventory/low-stock">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Low Stock ({lowStockCount})
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-muted-foreground">Total Items</p>
          </div>
          <p className="text-2xl font-bold">{totalItems}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-muted-foreground">Total Stock Qty</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{totalStock.toLocaleString()}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{lowStockCount}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-red-600" />
            <p className="text-sm font-medium text-muted-foreground">Out of Stock</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{outOfStockCount}</p>
        </div>
      </div>

      <InventoryList 
        inventory={inventory} 
        sites={sites}
        userRole={session.user.role}
        currentFilters={{
          siteId: params.siteId,
          lowStock: params.lowStock === 'true',
          search: params.search,
        }}
      />
    </div>
  );
}
