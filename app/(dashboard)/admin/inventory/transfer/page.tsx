import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { BulkStockTransferForm } from '@/components/admin/inventory/bulk-stock-transfer-form';
import { StockTransferList } from '@/components/admin/inventory/stock-transfer-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRightLeft, Clock, CheckCircle } from 'lucide-react';

export const metadata = {
  title: 'Stock Transfer | Admin',
  description: 'Manage stock transfers between sites',
};

async function getTransfers() {
  const transfersData = await prisma.inventoryMovement.findMany({
    where: {
      OR: [
        { movementType: 'TRANSFER_IN' },
        { movementType: 'TRANSFER_OUT' },
      ],
    },
    include: {
      inventory: {
        include: {
          product: {
            select: {
              sku: true,
              name: true,
              baseUom: true,
            },
          },
          site: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  // Get user details for transfers that have performedBy and convert Decimals
  const transfers = await Promise.all(
    transfersData.map(async (transfer) => {
      let user = null;
      if (transfer.performedBy) {
        user = await prisma.user.findUnique({
          where: { id: transfer.performedBy },
          select: { name: true, email: true },
        });
      }
      
      return {
        ...transfer,
        quantityBefore: Number(transfer.quantityBefore),
        quantityChange: Number(transfer.quantityChange),
        quantityAfter: Number(transfer.quantityAfter),
        inventory: {
          ...transfer.inventory,
          quantity: Number(transfer.inventory.quantity),
          reservedQty: Number(transfer.inventory.reservedQty),
          availableQty: Number(transfer.inventory.availableQty),
        },
        user,
      };
    })
  );

  return transfers;
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

async function getInventoryForTransfer() {
  const inventoryData = await prisma.inventory.findMany({
    where: {
      availableQty: { gt: 0 },
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
      { site: { name: 'asc' } },
      { product: { name: 'asc' } },
    ],
  });

  // Convert Decimal to number
  return inventoryData.map(inv => ({
    ...inv,
    quantity: Number(inv.quantity),
    reservedQty: Number(inv.reservedQty),
    availableQty: Number(inv.availableQty),
  }));
}

export default async function StockTransferPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  if (!session || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  const [transfers, sites, inventory] = await Promise.all([
    getTransfers(),
    getSites(),
    getInventoryForTransfer(),
  ]);

  // Calculate stats
  const pendingCount = transfers.filter((t) => t.notes?.includes('PENDING')).length;
  const completedCount = transfers.filter((t) => !t.notes?.includes('PENDING')).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stock Transfer</h1>
        <p className="text-muted-foreground">
          Transfer inventory between sites
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-muted-foreground">Total Transfers</div>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{transfers.length}</div>
          <p className="text-xs text-muted-foreground">Last 100 transfers</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-muted-foreground">Pending</div>
            <Clock className="h-4 w-4 text-yellow-600" />
          </div>
          <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-muted-foreground">Completed</div>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-600">{completedCount}</div>
          <p className="text-xs text-muted-foreground">Successfully transferred</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-muted-foreground">Active Sites</div>
            <ArrowRightLeft className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold">{sites.length}</div>
          <p className="text-xs text-muted-foreground">Available locations</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={params.tab || 'new'} className="space-y-4">
        <TabsList>
          <TabsTrigger value="new">New Transfer</TabsTrigger>
          <TabsTrigger value="history">Transfer History</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-4">
          <div className="border rounded-lg p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold">Create Stock Transfer</h3>
              <p className="text-sm text-muted-foreground">Select items from source site and transfer to destination</p>
            </div>
            <BulkStockTransferForm sites={sites} inventory={inventory} />
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Suspense fallback={<div>Loading...</div>}>
            <StockTransferList transfers={transfers} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
