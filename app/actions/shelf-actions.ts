'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import QRCode from 'qrcode'

// Authorization check
async function checkAuthorization() {
  const session = await auth()
  
  if (!session?.user?.id) {
    throw new Error('Unauthorized: Please log in')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true }
  })

  if (!user || !['ADMIN', 'MANAGER', 'STAFF'].includes(user.role)) {
    throw new Error('Unauthorized: Insufficient permissions')
  }

  return { userId: session.user.id, role: user.role }
}

// Validation schemas
const createShelfSchema = z.object({
  siteId: z.string().min(1, 'Site is required'),
  aisleId: z.string().optional(),
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  level: z.number().int().positive().optional(),
  position: z.number().int().positive().optional(),
  maxWeight: z.number().positive().optional(),
  maxVolume: z.number().positive().optional(),
  isActive: z.boolean().default(true),
  isAccessible: z.boolean().default(true),
  notes: z.string().optional(),
})

const updateShelfSchema = createShelfSchema.partial()

// Generate QR code
async function generateQRCode(shelfId: string, code: string, siteName: string): Promise<string> {
  const qrData = JSON.stringify({
    type: 'SHELF',
    shelfId,
    code,
    site: siteName,
    timestamp: new Date().toISOString()
  })
  
  // Generate QR code as data URL
  const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    width: 300,
    margin: 2,
  })
  
  return qrCodeDataUrl
}

// Get all shelves with filters
export async function getShelves(params: {
  siteId?: string
  aisleId?: string
  isActive?: boolean
  search?: string
}) {
  try {
    await checkAuthorization()

    const where: {
      siteId?: string
      aisleId?: string | null
      isActive?: boolean
      OR?: Array<{ code?: { contains: string; mode: 'insensitive' }; name?: { contains: string; mode: 'insensitive' } }>
    } = {}

    if (params.siteId) {
      where.siteId = params.siteId
    }

    if (params.aisleId) {
      where.aisleId = params.aisleId === 'none' ? null : params.aisleId
    }

    if (params.isActive !== undefined) {
      where.isActive = params.isActive
    }

    if (params.search) {
      where.OR = [
        { code: { contains: params.search, mode: 'insensitive' } },
        { name: { contains: params.search, mode: 'insensitive' } },
      ]
    }

    const shelves = await prisma.shelf.findMany({
      where,
      include: {
        site: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        aisle: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            binInventories: true,
          },
        },
      },
      orderBy: [
        { site: { name: 'asc' } },
        { aisle: { code: 'asc' } },
        { position: 'asc' },
        { level: 'asc' },
      ],
    })

    return {
      success: true,
      data: shelves,
    }
  } catch (error) {
    console.error('Get shelves error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch shelves',
    }
  }
}

// Get single shelf by ID
export async function getShelfById(shelfId: string) {
  try {
    await checkAuthorization()

    const shelf = await prisma.shelf.findUnique({
      where: { id: shelfId },
      include: {
        site: true,
        aisle: true,
        binInventories: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                barcode: true,
              },
            },
          },
        },
        _count: {
          select: {
            binInventories: true,
            movementsFrom: true,
            movementsTo: true,
          },
        },
      },
    })

    if (!shelf) {
      return {
        success: false,
        error: 'Shelf not found',
      }
    }

    // Serialize Decimal and Date types for client
    const serializedShelf = {
      ...shelf,
      maxWeight: shelf.maxWeight ? shelf.maxWeight.toString() : null,
      maxVolume: shelf.maxVolume ? shelf.maxVolume.toString() : null,
      binInventories: shelf.binInventories.map(bin => ({
        ...bin,
        quantity: bin.quantity.toString(),
        reservedQty: bin.reservedQty.toString(),
        availableQty: bin.availableQty.toString(),
      })),
    }

    return {
      success: true,
      data: serializedShelf,
    }
  } catch (error) {
    console.error('Get shelf error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch shelf',
    }
  }
}

// Create new shelf
export async function createShelf(formData: z.infer<typeof createShelfSchema>) {
  try {
    const { userId } = await checkAuthorization()

    const validatedFields = createShelfSchema.safeParse(formData)

    if (!validatedFields.success) {
      return {
        success: false,
        error: validatedFields.error.issues[0].message,
      }
    }

    const data = validatedFields.data

    // Check if code already exists for this site
    const existingShelf = await prisma.shelf.findUnique({
      where: {
        siteId_code: {
          siteId: data.siteId,
          code: data.code,
        },
      },
    })

    if (existingShelf) {
      return {
        success: false,
        error: 'Shelf code already exists for this site',
      }
    }

    // Get site info for QR code
    const site = await prisma.site.findUnique({
      where: { id: data.siteId },
      select: { name: true },
    })

    if (!site) {
      return {
        success: false,
        error: 'Site not found',
      }
    }

    // Generate unique QR code
    const qrCode = `SHELF-${data.siteId}-${data.code}-${Date.now()}`

    // Create shelf
    const shelf = await prisma.shelf.create({
      data: {
        ...data,
        qrCode,
        maxWeight: data.maxWeight ? data.maxWeight.toString() : undefined,
        maxVolume: data.maxVolume ? data.maxVolume.toString() : undefined,
      },
      include: {
        site: true,
        aisle: true,
      },
    })

    // Generate QR code image
    const qrCodeImage = await generateQRCode(shelf.id, shelf.code, site.name)

    // Update shelf with QR code image
    await prisma.shelf.update({
      where: { id: shelf.id },
      data: { qrCodeImage },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'CREATE_SHELF',
        description: `Created shelf: ${shelf.code} at ${site.name}`,
        metadata: { shelfId: shelf.id },
      },
    })

    revalidatePath('/admin/inventory/shelves')

    return {
      success: true,
      data: { ...shelf, qrCodeImage },
      message: 'Shelf created successfully',
    }
  } catch (error) {
    console.error('Create shelf error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create shelf',
    }
  }
}

// Update shelf
export async function updateShelf(shelfId: string, formData: z.infer<typeof updateShelfSchema>) {
  try {
    const { userId } = await checkAuthorization()

    const validatedFields = updateShelfSchema.safeParse(formData)

    if (!validatedFields.success) {
      return {
        success: false,
        error: validatedFields.error.issues[0].message,
      }
    }

    const data = validatedFields.data

    // Check if shelf exists
    const existingShelf = await prisma.shelf.findUnique({
      where: { id: shelfId },
    })

    if (!existingShelf) {
      return {
        success: false,
        error: 'Shelf not found',
      }
    }

    // If code is being changed, check for duplicates
    if (data.code && data.code !== existingShelf.code) {
      const duplicateShelf = await prisma.shelf.findUnique({
        where: {
          siteId_code: {
            siteId: data.siteId || existingShelf.siteId,
            code: data.code,
          },
        },
      })

      if (duplicateShelf) {
        return {
          success: false,
          error: 'Shelf code already exists for this site',
        }
      }
    }

    // Update shelf
    const updatedShelf = await prisma.shelf.update({
      where: { id: shelfId },
      data: {
        ...data,
        maxWeight: data.maxWeight ? data.maxWeight.toString() : undefined,
        maxVolume: data.maxVolume ? data.maxVolume.toString() : undefined,
      },
      include: {
        site: true,
        aisle: true,
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'UPDATE_SHELF',
        description: `Updated shelf: ${updatedShelf.code}`,
        metadata: { shelfId: updatedShelf.id, changes: data },
      },
    })

    revalidatePath('/admin/inventory/shelves')
    revalidatePath(`/admin/inventory/shelves/${shelfId}`)

    return {
      success: true,
      data: updatedShelf,
      message: 'Shelf updated successfully',
    }
  } catch (error) {
    console.error('Update shelf error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update shelf',
    }
  }
}

// Delete shelf
export async function deleteShelf(shelfId: string) {
  try {
    const { userId } = await checkAuthorization()

    const shelf = await prisma.shelf.findUnique({
      where: { id: shelfId },
      include: {
        _count: {
          select: {
            binInventories: true,
          },
        },
      },
    })

    if (!shelf) {
      return {
        success: false,
        error: 'Shelf not found',
      }
    }

    // Check if shelf has inventory
    if (shelf._count.binInventories > 0) {
      return {
        success: false,
        error: 'Cannot delete shelf with inventory. Please move inventory first.',
      }
    }

    await prisma.shelf.delete({
      where: { id: shelfId },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'DELETE_SHELF',
        description: `Deleted shelf: ${shelf.code}`,
        metadata: { shelfId: shelf.id },
      },
    })

    revalidatePath('/admin/inventory/shelves')

    return {
      success: true,
      message: 'Shelf deleted successfully',
    }
  } catch (error) {
    console.error('Delete shelf error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete shelf',
    }
  }
}

// Get sites for dropdown
export async function getSites() {
  try {
    await checkAuthorization()

    const sites = await prisma.site.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
      },
      orderBy: { name: 'asc' },
    })

    return {
      success: true,
      data: sites,
    }
  } catch (error) {
    console.error('Get sites error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch sites',
    }
  }
}

// Get aisles for dropdown
export async function getAisles(siteId?: string) {
  try {
    await checkAuthorization()

    const where = siteId ? { siteId, isActive: true } : { isActive: true }

    const aisles = await prisma.aisle.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        siteId: true,
      },
      orderBy: { code: 'asc' },
    })

    return {
      success: true,
      data: aisles,
    }
  } catch (error) {
    console.error('Get aisles error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch aisles',
    }
  }
}

// Regenerate QR code for shelf
export async function regenerateQRCode(shelfId: string) {
  try {
    const { userId } = await checkAuthorization()

    const shelf = await prisma.shelf.findUnique({
      where: { id: shelfId },
      include: {
        site: {
          select: { name: true },
        },
      },
    })

    if (!shelf) {
      return {
        success: false,
        error: 'Shelf not found',
      }
    }

    // Generate new QR code image
    const qrCodeImage = await generateQRCode(shelf.id, shelf.code, shelf.site.name)

    // Update shelf
    await prisma.shelf.update({
      where: { id: shelfId },
      data: { qrCodeImage },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'REGENERATE_QR',
        description: `Regenerated QR code for shelf: ${shelf.code}`,
        metadata: { shelfId: shelf.id },
      },
    })

    revalidatePath(`/admin/inventory/shelves/${shelfId}`)

    return {
      success: true,
      data: { qrCodeImage },
      message: 'QR code regenerated successfully',
    }
  } catch (error) {
    console.error('Regenerate QR code error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to regenerate QR code',
    }
  }
}

// Get available products for a site (not yet on this shelf)
export async function getAvailableProductsForShelf(
  shelfId: string, 
  search?: string,
  page: number = 1,
  limit: number = 20
) {
  try {
    await checkAuthorization()

    const shelf = await prisma.shelf.findUnique({
      where: { id: shelfId },
      select: { siteId: true },
    })

    if (!shelf) {
      return {
        success: false,
        error: 'Shelf not found',
      }
    }

    // Get products that have inventory at this site
    // We show all products with available quantity, even if already on shelf
    // This allows adding more quantity to existing shelf locations
    const where: {
      siteId: string
      availableQty: { gt: number }
      product?: {
        OR?: Array<{
          name?: { contains: string; mode: 'insensitive' }
          sku?: { contains: string; mode: 'insensitive' }
          barcode?: { contains: string; mode: 'insensitive' }
        }>
      }
    } = {
      siteId: shelf.siteId,
      availableQty: { gt: 0 },
    }

    if (search) {
      where.product = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
        ],
      }
    }

    // Get total count
    const total = await prisma.inventory.count({ where })

    // Get paginated data
    const productsData = await prisma.inventory.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            barcode: true,
            baseUom: true,
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { product: { name: 'asc' } },
    })

    // Get total quantity already assigned to shelves for each product at this site
    const productIds = productsData.map(p => p.productId)
    const shelfAssignments = await prisma.binInventory.groupBy({
      by: ['productId'],
      where: {
        siteId: shelf.siteId,
        productId: { in: productIds },
      },
      _sum: {
        quantity: true,
      },
    })

    // Create a map of productId to total shelf quantity
    const shelfQuantityMap = new Map(
      shelfAssignments.map(item => [
        item.productId,
        parseFloat(item._sum.quantity?.toString() || '0')
      ])
    )

    // Convert Decimal to string and calculate unassigned quantity
    const products = productsData
      .map(item => {
        const siteAvailable = parseFloat(item.availableQty.toString())
        const onShelves = shelfQuantityMap.get(item.productId) || 0
        const unassigned = siteAvailable - onShelves

        return {
          id: item.id,
          quantity: item.quantity.toString(),
          availableQty: Math.max(0, unassigned).toString(), // Show unassigned quantity
          siteAvailableQty: siteAvailable.toString(), // Keep original for reference
          product: item.product,
        }
      })
      .filter(item => parseFloat(item.availableQty) > 0) // Only show products with unassigned quantity

    return {
      success: true,
      data: products,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  } catch (error) {
    console.error('Get available products error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch products',
    }
  }
}

// Add product to shelf (create bin inventory)
export async function addProductToShelf(data: {
  shelfId: string
  productId: string
  quantity: number
  isPrimary?: boolean
}) {
  try {
    const { userId } = await checkAuthorization()

    // Validate inputs
    if (!data.shelfId || !data.productId || data.quantity <= 0) {
      return {
        success: false,
        error: 'Invalid input data',
      }
    }

    // Get shelf and product info
    const [shelf, product] = await Promise.all([
      prisma.shelf.findUnique({
        where: { id: data.shelfId },
        include: { site: true },
      }),
      prisma.product.findUnique({
        where: { id: data.productId },
        select: { id: true, name: true, sku: true },
      }),
    ])

    if (!shelf) {
      return {
        success: false,
        error: 'Shelf not found',
      }
    }

    if (!product) {
      return {
        success: false,
        error: 'Product not found',
      }
    }

    // Check if product already exists on this shelf
    const existingBin = await prisma.binInventory.findFirst({
      where: {
        shelfId: data.shelfId,
        productId: data.productId,
      },
    })

    // Get inventory for this product at this site
    const inventory = await prisma.inventory.findFirst({
      where: {
        siteId: shelf.siteId,
        productId: data.productId,
      },
    })

    if (!inventory) {
      return {
        success: false,
        error: 'Product not found in site inventory',
      }
    }

    // Check if there's enough available quantity
    const availableQty = parseFloat(inventory.availableQty.toString())
    if (availableQty < data.quantity) {
      return {
        success: false,
        error: `Insufficient quantity. Available: ${availableQty}`,
      }
    }

    let binInventory

    if (existingBin) {
      // Update existing bin inventory
      const currentQty = parseFloat(existingBin.quantity.toString())
      const currentAvailableQty = parseFloat(existingBin.availableQty.toString())
      const newQty = currentQty + data.quantity
      const newAvailableQty = currentAvailableQty + data.quantity

      binInventory = await prisma.binInventory.update({
        where: { id: existingBin.id },
        data: {
          quantity: newQty.toString(),
          availableQty: newAvailableQty.toString(),
        },
      })
    } else {
      // Create new bin inventory
      binInventory = await prisma.binInventory.create({
        data: {
          siteId: shelf.siteId,
          shelfId: data.shelfId,
          productId: data.productId,
          quantity: data.quantity.toString(),
          reservedQty: '0',
          availableQty: data.quantity.toString(),
          isPrimary: data.isPrimary || false,
        },
      })
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: existingBin ? 'UPDATE_SHELF_QUANTITY' : 'ADD_PRODUCT_TO_SHELF',
        description: existingBin 
          ? `Added ${data.quantity} more of ${product.name} to shelf ${shelf.code}`
          : `Added ${product.name} (${data.quantity}) to shelf ${shelf.code}`,
        metadata: {
          shelfId: shelf.id,
          productId: product.id,
          quantity: data.quantity,
          isUpdate: !!existingBin,
        },
      },
    })

    revalidatePath(`/admin/inventory/shelves/${data.shelfId}`)

    // Convert Decimal to string for client
    const serializedBinInventory = {
      id: binInventory.id,
      shelfId: binInventory.shelfId,
      productId: binInventory.productId,
      siteId: binInventory.siteId,
      quantity: binInventory.quantity.toString(),
      reservedQty: binInventory.reservedQty.toString(),
      availableQty: binInventory.availableQty.toString(),
      isPrimary: binInventory.isPrimary,
      createdAt: binInventory.createdAt.toISOString(),
      updatedAt: binInventory.updatedAt.toISOString(),
    }

    return {
      success: true,
      data: serializedBinInventory,
      message: existingBin 
        ? 'Quantity added to existing shelf location successfully'
        : 'Product added to shelf successfully',
    }
  } catch (error) {
    console.error('Add product to shelf error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add product to shelf',
    }
  }
}

// Remove product from shelf (delete bin inventory)
export async function removeProductFromShelf(binInventoryId: string) {
  try {
    const { userId } = await checkAuthorization()

    const binInventory = await prisma.binInventory.findUnique({
      where: { id: binInventoryId },
      include: {
        shelf: true,
        product: {
          select: { name: true, sku: true },
        },
      },
    })

    if (!binInventory) {
      return {
        success: false,
        error: 'Bin inventory not found',
      }
    }

    // Check if there's reserved quantity
    const reservedQty = parseFloat(binInventory.reservedQty.toString())
    if (reservedQty > 0) {
      return {
        success: false,
        error: 'Cannot remove product with reserved quantity',
      }
    }

    await prisma.binInventory.delete({
      where: { id: binInventoryId },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'REMOVE_PRODUCT_FROM_SHELF',
        description: `Removed ${binInventory.product.name} from shelf ${binInventory.shelf.code}`,
        metadata: {
          shelfId: binInventory.shelf.id,
          productId: binInventory.productId,
        },
      },
    })

    revalidatePath(`/admin/inventory/shelves/${binInventory.shelfId}`)

    return {
      success: true,
      message: 'Product removed from shelf successfully',
    }
  } catch (error) {
    console.error('Remove product from shelf error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove product from shelf',
    }
  }
}

// Create new aisle
export async function createAisle(data: {
  siteId: string
  code: string
  name: string
  description?: string
}) {
  try {
    const { userId } = await checkAuthorization()

    // Validate inputs
    if (!data.siteId || !data.code || !data.name) {
      return {
        success: false,
        error: 'Site, code, and name are required',
      }
    }

    // Check if code already exists for this site
    const existingAisle = await prisma.aisle.findFirst({
      where: {
        siteId: data.siteId,
        code: data.code,
      },
    })

    if (existingAisle) {
      return {
        success: false,
        error: 'Aisle code already exists for this site',
      }
    }

    // Create aisle
    const aisle = await prisma.aisle.create({
      data: {
        siteId: data.siteId,
        code: data.code,
        name: data.name,
        description: data.description,
        isActive: true,
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'CREATE_AISLE',
        description: `Created aisle: ${aisle.code} - ${aisle.name}`,
        metadata: { aisleId: aisle.id },
      },
    })

    revalidatePath('/admin/inventory/shelves')

    return {
      success: true,
      data: aisle,
      message: 'Aisle created successfully',
    }
  } catch (error) {
    console.error('Create aisle error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create aisle',
    }
  }
}
