'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Get all inventory with filters
 */
export async function getAllInventory(filters?: {
  siteId?: string;
  productId?: string;
  lowStock?: boolean;
  search?: string;
}): Promise<ActionResult<{
  id: string;
  quantity: number;
  reservedQty: number;
  availableQty: number;
  minStockLevel: number | null;
  maxStockLevel: number | null;
  reorderPoint: number | null;
  product: {
    id: string;
    sku: string;
    name: string;
    baseUom: string;
  };
  site: {
    id: string;
    code: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
}[]>> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const where: {
      siteId?: string;
      productId?: string;
      product?: {
        OR?: Array<{
          name?: { contains: string; mode: 'insensitive' };
          sku?: { contains: string; mode: 'insensitive' };
        }>;
      };
    } = {};
    
    if (filters?.siteId) where.siteId = filters.siteId;
    if (filters?.productId) where.productId = filters.productId;
    if (filters?.search) {
      where.product = {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { sku: { contains: filters.search, mode: 'insensitive' } },
        ],
      };
    }

    const inventoryData = await prisma.inventory.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            baseUom: true,
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

    // Convert Decimal to number and filter low stock if needed
    let inventory = inventoryData.map(inv => ({
      ...inv,
      quantity: Number(inv.quantity),
      reservedQty: Number(inv.reservedQty),
      availableQty: Number(inv.availableQty),
      minStockLevel: inv.minStockLevel ? Number(inv.minStockLevel) : null,
      maxStockLevel: inv.maxStockLevel ? Number(inv.maxStockLevel) : null,
      reorderPoint: inv.reorderPoint ? Number(inv.reorderPoint) : null,
    }));

    if (filters?.lowStock) {
      inventory = inventory.filter(inv => 
        inv.minStockLevel !== null && inv.availableQty <= inv.minStockLevel
      );
    }

    return { success: true, data: inventory };
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return { success: false, error: 'Failed to fetch inventory' };
  }
}

/**
 * Get inventory by ID
 */
export async function getInventoryById(id: string): Promise<ActionResult<{
  id: string;
  quantity: number;
  reservedQty: number;
  availableQty: number;
  minStockLevel: number | null;
  maxStockLevel: number | null;
  reorderPoint: number | null;
  productId: string;
  siteId: string;
  product: {
    id: string;
    sku: string;
    name: string;
    baseUom: string;
  };
  site: {
    id: string;
    code: string;
    name: string;
  };
}>> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const inventoryData = await prisma.inventory.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            baseUom: true,
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

    if (!inventoryData) {
      return { success: false, error: 'Inventory not found' };
    }

    const inventory = {
      ...inventoryData,
      quantity: Number(inventoryData.quantity),
      reservedQty: Number(inventoryData.reservedQty),
      availableQty: Number(inventoryData.availableQty),
      minStockLevel: inventoryData.minStockLevel ? Number(inventoryData.minStockLevel) : null,
      maxStockLevel: inventoryData.maxStockLevel ? Number(inventoryData.maxStockLevel) : null,
      reorderPoint: inventoryData.reorderPoint ? Number(inventoryData.reorderPoint) : null,
    };

    return { success: true, data: inventory };
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return { success: false, error: 'Failed to fetch inventory' };
  }
}

/**
 * Adjust inventory quantity
 */
export async function adjustInventory(
  inventoryId: string,
  quantityChange: number,
  movementType: string,
  reason?: string,
  notes?: string
): Promise<ActionResult> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const inventory = await prisma.inventory.findUnique({
      where: { id: inventoryId },
    });

    if (!inventory) {
      return { success: false, error: 'Inventory not found' };
    }

    const quantityBefore = Number(inventory.quantity);
    const quantityAfter = quantityBefore + quantityChange;

    if (quantityAfter < 0) {
      return { success: false, error: 'Insufficient stock' };
    }

    // Update inventory and create movement in a transaction
    await prisma.$transaction([
      prisma.inventory.update({
        where: { id: inventoryId },
        data: {
          quantity: quantityAfter,
          availableQty: quantityAfter - Number(inventory.reservedQty),
          lastUpdatedBy: session.user.id,
        },
      }),
      prisma.inventoryMovement.create({
        data: {
          inventoryId,
          movementType: 'ADJUSTMENT',
          quantityBefore,
          quantityChange,
          quantityAfter,
          reason,
          notes,
          performedBy: session.user.id,
        },
      }),
    ]);

    revalidatePath('/admin/inventory');
    
    return { success: true };
  } catch (error) {
    console.error('Error adjusting inventory:', error);
    return { success: false, error: 'Failed to adjust inventory' };
  }
}

/**
 * Update inventory settings (min/max/reorder levels)
 */
export async function updateInventorySettings(
  inventoryId: string,
  settings: {
    minStockLevel?: number | null;
    maxStockLevel?: number | null;
    reorderPoint?: number | null;
  }
): Promise<ActionResult> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    await prisma.inventory.update({
      where: { id: inventoryId },
      data: {
        minStockLevel: settings.minStockLevel,
        maxStockLevel: settings.maxStockLevel,
        reorderPoint: settings.reorderPoint,
        lastUpdatedBy: session.user.id,
      },
    });

    revalidatePath('/admin/inventory');
    
    return { success: true };
  } catch (error) {
    console.error('Error updating inventory settings:', error);
    return { success: false, error: 'Failed to update settings' };
  }
}

/**
 * Get inventory movements/history
 */
export async function getInventoryMovements(inventoryId: string): Promise<ActionResult<{
  id: string;
  movementType: string;
  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;
  reason: string | null;
  notes: string | null;
  performedBy: string | null;
  createdAt: Date;
}[]>> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const movementsData = await prisma.inventoryMovement.findMany({
      where: { inventoryId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const movements = movementsData.map(mov => ({
      ...mov,
      quantityBefore: Number(mov.quantityBefore),
      quantityChange: Number(mov.quantityChange),
      quantityAfter: Number(mov.quantityAfter),
    }));

    return { success: true, data: movements };
  } catch (error) {
    console.error('Error fetching movements:', error);
    return { success: false, error: 'Failed to fetch movements' };
  }
}

/**
 * Stock Adjustment (IN/OUT)
 */
export async function adjustStock(data: {
  inventoryId: string;
  type: 'IN' | 'OUT';
  quantity: number;
  reason: string;
  reference?: string;
}): Promise<ActionResult> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const { inventoryId, type, quantity, reason, reference } = data;

    if (quantity <= 0) {
      return { success: false, error: 'Quantity must be greater than 0' };
    }

    // Get inventory
    const inventory = await prisma.inventory.findUnique({
      where: { id: inventoryId },
    });

    if (!inventory) {
      return { success: false, error: 'Inventory not found' };
    }

    // Check if sufficient stock for OUT adjustment
    if (type === 'OUT' && Number(inventory.availableQty) < quantity) {
      return { success: false, error: 'Insufficient available stock' };
    }

    const adjustmentQty = type === 'IN' ? quantity : -quantity;

    // Perform adjustment in transaction
    await prisma.$transaction(async (tx) => {
      // Update inventory
      await tx.inventory.update({
        where: { id: inventoryId },
        data: {
          quantity: { increment: adjustmentQty },
          availableQty: { increment: adjustmentQty },
        },
      });

      // Record movement
      const quantityBefore = Number(inventory.quantity);
      const quantityAfter = quantityBefore + adjustmentQty;
      
      await tx.inventoryMovement.create({
        data: {
          inventoryId,
          movementType: 'ADJUSTMENT',
          quantityBefore,
          quantityChange: adjustmentQty,
          quantityAfter,
          reason,
          notes: reference ? `Ref: ${reference}` : undefined,
          performedBy: session.user.id,
        },
      });
    });

    revalidatePath('/admin/inventory');
    revalidatePath('/admin/inventory/adjust');
    
    return { success: true };
  } catch (error) {
    console.error('Adjustment error:', error);
    return { success: false, error: 'Failed to adjust stock' };
  }
}

/**
 * Stock Transfer between sites
 */
export async function transferStock(data: {
  productId: string;
  fromSiteId: string;
  toSiteId: string;
  quantity: number;
  notes?: string;
}): Promise<ActionResult> {
  const session = await auth();
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const { productId, fromSiteId, toSiteId, quantity, notes } = data;

    if (fromSiteId === toSiteId) {
      return { success: false, error: 'Source and destination sites must be different' };
    }

    if (quantity <= 0) {
      return { success: false, error: 'Quantity must be greater than 0' };
    }

    // Get source inventory
    const sourceInventory = await prisma.inventory.findFirst({
      where: {
        productId,
        siteId: fromSiteId,
      },
    });

    if (!sourceInventory) {
      return { success: false, error: 'Source inventory not found' };
    }

    if (Number(sourceInventory.availableQty) < quantity) {
      return { success: false, error: 'Insufficient stock at source site' };
    }

    // Get or create destination inventory
    let destInventory = await prisma.inventory.findFirst({
      where: {
        productId,
        siteId: toSiteId,
      },
    });

    const [fromSite, toSite] = await Promise.all([
      prisma.site.findUnique({ where: { id: fromSiteId }, select: { code: true } }),
      prisma.site.findUnique({ where: { id: toSiteId }, select: { code: true } }),
    ]);

    // Perform transfer in transaction
    await prisma.$transaction(async (tx) => {
      // Deduct from source
      await tx.inventory.update({
        where: { id: sourceInventory.id },
        data: {
          quantity: { decrement: quantity },
          availableQty: { decrement: quantity },
        },
      });

      // Record source movement
      const sourceQtyBefore = Number(sourceInventory.quantity);
      const sourceQtyAfter = sourceQtyBefore - quantity;
      
      await tx.inventoryMovement.create({
        data: {
          inventoryId: sourceInventory.id,
          movementType: 'TRANSFER_OUT',
          quantityBefore: sourceQtyBefore,
          quantityChange: -quantity,
          quantityAfter: sourceQtyAfter,
          toSiteId,
          notes: `Transfer to: ${toSite?.code || toSiteId}${notes ? ` - ${notes}` : ''}`,
          performedBy: session.user.id,
        },
      });

      // Add to destination
      if (destInventory) {
        await tx.inventory.update({
          where: { id: destInventory.id },
          data: {
            quantity: { increment: quantity },
            availableQty: { increment: quantity },
          },
        });
      } else {
        destInventory = await tx.inventory.create({
          data: {
            productId,
            siteId: toSiteId,
            quantity,
            reservedQty: 0,
            availableQty: quantity,
          },
        });
      }

      // Record destination movement
      const destQtyBefore = destInventory ? Number(destInventory.quantity) : 0;
      const destQtyAfter = destQtyBefore + quantity;
      
      await tx.inventoryMovement.create({
        data: {
          inventoryId: destInventory.id,
          movementType: 'TRANSFER_IN',
          quantityBefore: destQtyBefore,
          quantityChange: quantity,
          quantityAfter: destQtyAfter,
          fromSiteId,
          notes: `Transfer from: ${fromSite?.code || fromSiteId}${notes ? ` - ${notes}` : ''}`,
          performedBy: session.user.id,
        },
      });
    });

    revalidatePath('/admin/inventory');
    revalidatePath('/admin/inventory/transfer');
    
    return { success: true };
  } catch (error) {
    console.error('Transfer error:', error);
    return { success: false, error: 'Failed to process transfer' };
  }
}
