'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
  message?: string
}

async function checkAuthorization() {
  const session = await auth()
  
  if (!session?.user?.id) {
    throw new Error('Unauthorized: Please log in')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true }
  })

  if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) {
    throw new Error('Unauthorized: Insufficient permissions')
  }

  return { userId: session.user.id, role: user.role }
}

// Save canvassing with items
export async function saveCanvassing(data: {
  legacyDocCode: string
  legacyRefCode: string
  siteCode: string
  partyName: string
  partyTermsText: string
  items: Array<{
    barcode: string
    productName: string
    originalPrice: number
    supplier1Name: string
    supplier1Price: string
    supplier1Terms: string
    supplier2Name: string
    supplier2Price: string
    supplier2Terms: string
    supplier3Name: string
    supplier3Price: string
    supplier3Terms: string
  }>
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId } = await checkAuthorization()

    // Check if canvassing already exists
    const existing = await prisma.canvassing.findUnique({
      where: { legacyDocCode: data.legacyDocCode }
    })

    if (existing) {
      return {
        success: false,
        error: 'Canvassing already exists for this doc code'
      }
    }

    // Create canvassing document
    const canvassing = await prisma.canvassing.create({
      data: {
        legacyDocCode: data.legacyDocCode,
        legacyRefCode: data.legacyRefCode,
        siteCode: data.siteCode,
        partyName: data.partyName,
        partyTermsText: data.partyTermsText,
        status: 'IN_PROGRESS',
        createdBy: userId
      }
    })

    // Create items
    let itemCount = 0
    for (const item of data.items) {
      // Skip items without any supplier data
      const hasSupplierData = 
        item.supplier1Name || item.supplier1Price || item.supplier1Terms ||
        item.supplier2Name || item.supplier2Price || item.supplier2Terms ||
        item.supplier3Name || item.supplier3Price || item.supplier3Terms
      
      if (!hasSupplierData) {
        continue
      }

      // Try to find product
      const product = await prisma.product.findUnique({
        where: { barcode: item.barcode },
        select: { id: true }
      })

      await prisma.canvassingItem.create({
        data: {
          canvassingId: canvassing.id,
          productId: product?.id,
          barcode: item.barcode,
          productName: item.productName,
          originalPrice: item.originalPrice,
          supplier1Name: item.supplier1Name || null,
          supplier1Price: item.supplier1Price ? parseFloat(item.supplier1Price) : null,
          supplier1Terms: item.supplier1Terms || null,
          supplier2Name: item.supplier2Name || null,
          supplier2Price: item.supplier2Price ? parseFloat(item.supplier2Price) : null,
          supplier2Terms: item.supplier2Terms || null,
          supplier3Name: item.supplier3Name || null,
          supplier3Price: item.supplier3Price ? parseFloat(item.supplier3Price) : null,
          supplier3Terms: item.supplier3Terms || null
        }
      })

      itemCount++
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'CREATE_CANVASSING',
        description: `Created canvassing ${data.legacyDocCode} with ${itemCount} items`,
        metadata: { canvassingId: canvassing.id, itemCount }
      }
    })

    revalidatePath('/admin/canvassing')

    return {
      success: true,
      data: { id: canvassing.id },
      message: `Saved canvassing with ${itemCount} items successfully`
    }
  } catch (error) {
    console.error('Save canvassing error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save canvassing'
    }
  }
}

// Get all canvassings with pagination
export async function getCanvassings(params: {
  page?: number
  limit?: number
  search?: string
  status?: string
}): Promise<ActionResult<{
  data: Array<{
    id: string
    legacyDocCode: string
    legacyRefCode: string | null
    siteCode: string
    partyName: string | null
    partyTermsText: string | null
    status: string
    itemCount: number
    createdAt: Date
  }>
  total: number
  page: number
  totalPages: number
}>> {
  try {
    await checkAuthorization()

    const page = params.page || 1
    const limit = params.limit || 20
    const skip = (page - 1) * limit

    type WhereInput = {
      status?: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
      OR?: Array<{
        legacyDocCode?: { contains: string; mode: 'insensitive' }
        partyName?: { contains: string; mode: 'insensitive' }
      }>
    }

    const where: WhereInput = {}

    if (params.status) {
      where.status = params.status as 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
    }

    if (params.search) {
      where.OR = [
        { legacyDocCode: { contains: params.search, mode: 'insensitive' } },
        { partyName: { contains: params.search, mode: 'insensitive' } }
      ]
    }

    const [canvassings, total] = await Promise.all([
      prisma.canvassing.findMany({
        where,
        include: {
          _count: {
            select: { items: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.canvassing.count({ where })
    ])

    const data = canvassings.map(c => ({
      id: c.id,
      legacyDocCode: c.legacyDocCode,
      legacyRefCode: c.legacyRefCode,
      siteCode: c.siteCode,
      partyName: c.partyName,
      partyTermsText: c.partyTermsText,
      status: c.status,
      itemCount: c._count.items,
      createdAt: c.createdAt
    }))

    return {
      success: true,
      data: {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) {
    console.error('Get canvassings error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch canvassings'
    }
  }
}

// Get canvassing by ID with items
export async function getCanvassingById(id: string): Promise<ActionResult<{
  id: string
  legacyDocCode: string
  legacyRefCode: string | null
  siteCode: string
  partyName: string | null
  partyTermsText: string | null
  status: string
  notes: string | null
  createdAt: Date
  items: Array<{
    id: string
    barcode: string
    productName: string
    originalPrice: number | null
    supplier1Name: string | null
    supplier1Price: number | null
    supplier1Terms: string | null
    supplier2Name: string | null
    supplier2Price: number | null
    supplier2Terms: string | null
    supplier3Name: string | null
    supplier3Price: number | null
    supplier3Terms: string | null
  }>
}>> {
  try {
    await checkAuthorization()

    const canvassing = await prisma.canvassing.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { productName: 'asc' }
        }
      }
    })

    if (!canvassing) {
      return {
        success: false,
        error: 'Canvassing not found'
      }
    }

    const data = {
      id: canvassing.id,
      legacyDocCode: canvassing.legacyDocCode,
      legacyRefCode: canvassing.legacyRefCode,
      siteCode: canvassing.siteCode,
      partyName: canvassing.partyName,
      partyTermsText: canvassing.partyTermsText,
      status: canvassing.status,
      notes: canvassing.notes,
      createdAt: canvassing.createdAt,
      items: canvassing.items.map(item => ({
        id: item.id,
        barcode: item.barcode,
        productName: item.productName,
        originalPrice: item.originalPrice ? parseFloat(item.originalPrice.toString()) : null,
        supplier1Name: item.supplier1Name,
        supplier1Price: item.supplier1Price ? parseFloat(item.supplier1Price.toString()) : null,
        supplier1Terms: item.supplier1Terms,
        supplier2Name: item.supplier2Name,
        supplier2Price: item.supplier2Price ? parseFloat(item.supplier2Price.toString()) : null,
        supplier2Terms: item.supplier2Terms,
        supplier3Name: item.supplier3Name,
        supplier3Price: item.supplier3Price ? parseFloat(item.supplier3Price.toString()) : null,
        supplier3Terms: item.supplier3Terms
      }))
    }

    return {
      success: true,
      data
    }
  } catch (error) {
    console.error('Get canvassing error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch canvassing'
    }
  }
}

// Update canvassing items (mainly for payment terms)
export async function updateCanvassingItems(
  canvassingId: string,
  items: Array<{
    id: string
    supplier1Terms: string | null
    supplier2Terms: string | null
    supplier3Terms: string | null
  }>
): Promise<ActionResult> {
  try {
    await checkAuthorization()

    // Update each item
    for (const item of items) {
      await prisma.canvassingItem.update({
        where: { id: item.id },
        data: {
          supplier1Terms: item.supplier1Terms || null,
          supplier2Terms: item.supplier2Terms || null,
          supplier3Terms: item.supplier3Terms || null
        }
      })
    }

    revalidatePath(`/admin/canvassing/${canvassingId}`)
    revalidatePath('/admin/canvassing')

    return {
      success: true,
      message: 'Payment terms updated successfully'
    }
  } catch (error) {
    console.error('Update canvassing items error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update items'
    }
  }
}
