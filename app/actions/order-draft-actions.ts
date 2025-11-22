'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

// Authorization check
async function checkAuthorization() {
  const session = await auth()
  
  if (!session?.user?.id) {
    throw new Error('Unauthorized: Please log in')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, id: true, name: true }
  })

  if (!user || !['ADMIN', 'MANAGER', 'STAFF'].includes(user.role)) {
    throw new Error('Unauthorized: Insufficient permissions')
  }

  return { userId: session.user.id, role: user.role, name: user.name }
}

// Generate draft number
function generateDraftNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `DRAFT-${year}${month}${day}-${random}`
}

// Create new order draft
export async function createOrderDraft(data: {
  siteId: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  notes?: string
}) {
  try {
    const { userId } = await checkAuthorization()

    const draft = await prisma.orderDraft.create({
      data: {
        draftNumber: generateDraftNumber(),
        salesmanId: userId,
        siteId: data.siteId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        notes: data.notes,
        status: 'IN_PROGRESS',
      },
      include: {
        salesman: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        site: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    })

    revalidatePath('/staff/order-taker')

    // Serialize Decimal values for client
    const serializedDraft = {
      ...draft,
      subtotal: draft.subtotal.toString(),
      totalAmount: draft.totalAmount.toString(),
    }

    return {
      success: true,
      data: serializedDraft,
      message: 'Draft order created successfully',
    }
  } catch (error) {
    console.error('Create order draft error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create draft order',
    }
  }
}

// Get salesman's drafts
export async function getSalesmanDrafts(status?: 'IN_PROGRESS' | 'SENT_TO_CASHIER' | 'COMPLETED' | 'CANCELLED' | 'ALL') {
  try {
    const { userId } = await checkAuthorization()

    type WhereClause = {
      salesmanId: string
      status?: 'IN_PROGRESS' | 'SENT_TO_CASHIER' | 'COMPLETED' | 'CANCELLED'
    }

    const where: WhereClause = {
      salesmanId: userId,
    }

    if (status && status !== 'ALL') {
      where.status = status
    }

    const drafts = await prisma.orderDraft.findMany({
      where,
      include: {
        salesman: {
          select: {
            id: true,
            name: true,
          },
        },
        site: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                barcode: true,
                retailPrice: true,
                images: {
                  where: { isPrimary: true },
                  take: 1,
                  select: { url: true },
                },
              },
            },
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Serialize Decimal values for client
    const serializedDrafts = drafts.map(draft => ({
      ...draft,
      subtotal: draft.subtotal.toString(),
      totalAmount: draft.totalAmount.toString(),
      items: draft.items.map(item => ({
        ...item,
        unitPrice: item.unitPrice.toString(),
        subtotal: item.subtotal.toString(),
        product: {
          ...item.product,
          retailPrice: item.product.retailPrice.toString(),
        },
      })),
    }))

    return {
      success: true,
      data: serializedDrafts,
    }
  } catch (error) {
    console.error('Get salesman drafts error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch drafts',
    }
  }
}

// Get single draft by ID
export async function getOrderDraftById(draftId: string) {
  try {
    await checkAuthorization()

    const draft = await prisma.orderDraft.findUnique({
      where: { id: draftId },
      include: {
        salesman: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        site: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                barcode: true,
                retailPrice: true,
                wholesalePrice: true,
                images: {
                  where: { isPrimary: true },
                  take: 1,
                  select: { url: true },
                },
                category: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    })

    if (!draft) {
      return {
        success: false,
        error: 'Draft not found',
      }
    }

    // Serialize Decimal values for client
    const serializedDraft = {
      ...draft,
      subtotal: draft.subtotal.toString(),
      totalAmount: draft.totalAmount.toString(),
      items: draft.items.map(item => ({
        ...item,
        unitPrice: item.unitPrice.toString(),
        subtotal: item.subtotal.toString(),
        product: {
          ...item.product,
          retailPrice: item.product.retailPrice.toString(),
          wholesalePrice: item.product.wholesalePrice ? item.product.wholesalePrice.toString() : null,
        },
      })),
    }

    return {
      success: true,
      data: serializedDraft,
    }
  } catch (error) {
    console.error('Get order draft error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch draft',
    }
  }
}

// Add item to draft
export async function addItemToDraft(data: {
  draftId: string
  productId: string
  quantity: number
  unitPrice: number
  notes?: string
}) {
  try {
    await checkAuthorization()

    // Check if item already exists
    const existingItem = await prisma.orderDraftItem.findFirst({
      where: {
        draftId: data.draftId,
        productId: data.productId,
      },
    })

    let item

    if (existingItem) {
      // Update existing item
      const newQuantity = existingItem.quantity + data.quantity
      const newSubtotal = newQuantity * parseFloat(existingItem.unitPrice.toString())

      item = await prisma.orderDraftItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          subtotal: newSubtotal.toString(),
        },
      })
    } else {
      // Create new item
      const subtotal = data.quantity * data.unitPrice

      item = await prisma.orderDraftItem.create({
        data: {
          draftId: data.draftId,
          productId: data.productId,
          quantity: data.quantity,
          unitPrice: data.unitPrice.toString(),
          subtotal: subtotal.toString(),
          notes: data.notes,
        },
      })
    }

    // Update draft totals
    await updateDraftTotals(data.draftId)

    revalidatePath('/staff/order-taker')
    revalidatePath(`/staff/order-taker/${data.draftId}`)

    // Serialize Decimal values
    const serializedItem = {
      ...item,
      unitPrice: item.unitPrice.toString(),
      subtotal: item.subtotal.toString(),
    }

    return {
      success: true,
      data: serializedItem,
      message: existingItem ? 'Item quantity updated' : 'Item added to draft',
    }
  } catch (error) {
    console.error('Add item to draft error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add item',
    }
  }
}

// Update draft item
export async function updateDraftItem(itemId: string, data: {
  quantity?: number
  unitPrice?: number
  notes?: string
}) {
  try {
    await checkAuthorization()

    const item = await prisma.orderDraftItem.findUnique({
      where: { id: itemId },
    })

    if (!item) {
      return {
        success: false,
        error: 'Item not found',
      }
    }

    const quantity = data.quantity ?? item.quantity
    const unitPrice = data.unitPrice ?? parseFloat(item.unitPrice.toString())
    const subtotal = quantity * unitPrice

    const updatedItem = await prisma.orderDraftItem.update({
      where: { id: itemId },
      data: {
        quantity,
        unitPrice: unitPrice.toString(),
        subtotal: subtotal.toString(),
        notes: data.notes ?? item.notes,
      },
    })

    // Update draft totals
    await updateDraftTotals(item.draftId)

    revalidatePath('/staff/order-taker')
    revalidatePath(`/staff/order-taker/${item.draftId}`)

    // Serialize Decimal values
    const serializedItem = {
      ...updatedItem,
      unitPrice: updatedItem.unitPrice.toString(),
      subtotal: updatedItem.subtotal.toString(),
    }

    return {
      success: true,
      data: serializedItem,
      message: 'Item updated successfully',
    }
  } catch (error) {
    console.error('Update draft item error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update item',
    }
  }
}

// Remove item from draft
export async function removeItemFromDraft(itemId: string) {
  try {
    await checkAuthorization()

    const item = await prisma.orderDraftItem.findUnique({
      where: { id: itemId },
    })

    if (!item) {
      return {
        success: false,
        error: 'Item not found',
      }
    }

    await prisma.orderDraftItem.delete({
      where: { id: itemId },
    })

    // Update draft totals
    await updateDraftTotals(item.draftId)

    revalidatePath('/staff/order-taker')
    revalidatePath(`/staff/order-taker/${item.draftId}`)

    return {
      success: true,
      message: 'Item removed successfully',
    }
  } catch (error) {
    console.error('Remove item from draft error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove item',
    }
  }
}

// Helper function to update draft totals
async function updateDraftTotals(draftId: string) {
  const items = await prisma.orderDraftItem.findMany({
    where: { draftId },
  })

  const subtotal = items.reduce((sum, item) => {
    return sum + parseFloat(item.subtotal.toString())
  }, 0)

  await prisma.orderDraft.update({
    where: { id: draftId },
    data: {
      subtotal: subtotal.toString(),
      totalAmount: subtotal.toString(), // Can add tax/discounts later
    },
  })
}

// Send draft to cashier
export async function sendDraftToCashier(draftId: string) {
  try {
    const { userId } = await checkAuthorization()

    const draft = await prisma.orderDraft.findUnique({
      where: { id: draftId },
      include: {
        items: true,
      },
    })

    if (!draft) {
      return {
        success: false,
        error: 'Draft not found',
      }
    }

    if (draft.items.length === 0) {
      return {
        success: false,
        error: 'Cannot send empty draft to cashier',
      }
    }

    if (draft.status !== 'IN_PROGRESS') {
      return {
        success: false,
        error: 'Draft has already been sent',
      }
    }

    await prisma.orderDraft.update({
      where: { id: draftId },
      data: {
        status: 'SENT_TO_CASHIER',
        sentToCashierAt: new Date(),
      },
    })

    revalidatePath('/staff/order-taker')
    revalidatePath('/cashier/queue')

    return {
      success: true,
      message: 'Draft sent to cashier successfully',
    }
  } catch (error) {
    console.error('Send draft to cashier error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send draft',
    }
  }
}

// Get cashier queue (drafts waiting to be processed)
export async function getCashierQueue(siteId?: string) {
  try {
    await checkAuthorization()

    type WhereClause = {
      status: 'SENT_TO_CASHIER'
      siteId?: string
    }

    const where: WhereClause = {
      status: 'SENT_TO_CASHIER',
    }

    if (siteId) {
      where.siteId = siteId
    }

    const drafts = await prisma.orderDraft.findMany({
      where,
      include: {
        salesman: {
          select: {
            id: true,
            name: true,
          },
        },
        site: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                retailPrice: true,
              },
            },
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: {
        sentToCashierAt: 'asc',
      },
    })

    // Serialize Decimal values for client
    const serializedDrafts = drafts.map(draft => ({
      ...draft,
      subtotal: draft.subtotal.toString(),
      totalAmount: draft.totalAmount.toString(),
      items: draft.items.map(item => ({
        ...item,
        unitPrice: item.unitPrice.toString(),
        subtotal: item.subtotal.toString(),
        product: {
          ...item.product,
          retailPrice: item.product.retailPrice.toString(),
        },
      })),
    }))

    return {
      success: true,
      data: serializedDrafts,
    }
  } catch (error) {
    console.error('Get cashier queue error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch cashier queue',
    }
  }
}

// Delete/Cancel draft
export async function cancelOrderDraft(draftId: string) {
  try {
    await checkAuthorization()

    const draft = await prisma.orderDraft.findUnique({
      where: { id: draftId },
    })

    if (!draft) {
      return {
        success: false,
        error: 'Draft not found',
      }
    }

    if (draft.status === 'COMPLETED') {
      return {
        success: false,
        error: 'Cannot cancel completed draft',
      }
    }

    await prisma.orderDraft.update({
      where: { id: draftId },
      data: {
        status: 'CANCELLED',
      },
    })

    revalidatePath('/staff/order-taker')
    revalidatePath('/cashier/queue')

    return {
      success: true,
      message: 'Draft cancelled successfully',
    }
  } catch (error) {
    console.error('Cancel draft error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel draft',
    }
  }
}

// Update draft customer info
export async function updateDraftCustomer(draftId: string, data: {
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  notes?: string
}) {
  try {
    await checkAuthorization()

    const draft = await prisma.orderDraft.update({
      where: { id: draftId },
      data: {
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        notes: data.notes,
      },
    })

    revalidatePath('/staff/order-taker')
    revalidatePath(`/staff/order-taker/${draftId}`)

    return {
      success: true,
      data: draft,
      message: 'Customer info updated',
    }
  } catch (error) {
    console.error('Update draft customer error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update customer info',
    }
  }
}

// Search products for order taker
export async function searchProductsForOrder(query: string, siteId: string) {
  try {
    await checkAuthorization()

    const whereClause: {
      isActive: boolean
      isPublished: boolean
      OR?: Array<{ name?: { contains: string; mode: 'insensitive' }; sku?: { contains: string; mode: 'insensitive' }; barcode?: { contains: string; mode: 'insensitive' } }>
      inventories: { some: { siteId: string; availableQty: { gt: number } } }
    } = {
      isActive: true,
      isPublished: true,
      inventories: {
        some: {
          siteId,
          availableQty: { gt: 0 },
        },
      },
    }

    // Only add search filter if query is provided
    if (query && query.trim().length > 0) {
      whereClause.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { sku: { contains: query, mode: 'insensitive' } },
        { barcode: { contains: query, mode: 'insensitive' } },
      ]
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        retailPrice: true,
        wholesalePrice: true,
        images: {
          where: { isPrimary: true },
          take: 1,
          select: { url: true },
        },
        category: {
          select: { name: true },
        },
        inventories: {
          where: { siteId },
          select: {
            availableQty: true,
          },
        },
        binInventories: {
          where: { siteId },
          select: {
            shelf: {
              select: {
                code: true,
                aisle: {
                  select: {
                    code: true,
                  },
                },
              },
            },
            isPrimary: true,
          },
          orderBy: {
            isPrimary: 'desc',
          },
          take: 1,
        },
      },
      take: query ? 20 : 100, // Load more products when not searching
      orderBy: {
        name: 'asc',
      },
    })

    // Convert Decimal to number for client
    const formattedProducts = products.map(product => {
      const primaryBin = product.binInventories[0]
      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        retailPrice: parseFloat(product.retailPrice.toString()),
        wholesalePrice: product.wholesalePrice ? parseFloat(product.wholesalePrice.toString()) : null,
        images: product.images,
        category: product.category,
        availableQty: product.inventories[0] ? parseFloat(product.inventories[0].availableQty.toString()) : 0,
        shelfCode: primaryBin?.shelf?.code || null,
        aisleCode: primaryBin?.shelf?.aisle?.code || null,
      }
    })

    return {
      success: true,
      data: formattedProducts,
    }
  } catch (error) {
    console.error('Search products error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search products',
    }
  }
}
