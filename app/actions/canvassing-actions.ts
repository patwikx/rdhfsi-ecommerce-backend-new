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

// Import purchase requests from legacy system
export async function importPurchaseRequests(
  requests: Array<{
    barcode: string
    name: string
    docCode: string
    price: number
    siteCode: string
    partyName: string
    partyTermsText: string
    refCode1: string
  }>
): Promise<ActionResult<{ imported: number; updated: number; skipped: number }>> {
  try {
    const { userId } = await checkAuthorization()

    let imported = 0
    let updated = 0
    let skipped = 0

    for (const request of requests) {
      try {
        // Try to find matching product by barcode
        const product = await prisma.product.findUnique({
          where: { barcode: request.barcode },
          select: { id: true }
        })

        // Check if purchase request already exists
        const existing = await prisma.purchaseRequest.findUnique({
          where: {
            legacyDocCode_barcode: {
              legacyDocCode: request.docCode,
              barcode: request.barcode
            }
          }
        })

        if (existing) {
          // Update existing
          await prisma.purchaseRequest.update({
            where: { id: existing.id },
            data: {
              productId: product?.id,
              productName: request.name,
              requestedPrice: request.price,
              partyName: request.partyName,
              partyTermsText: request.partyTermsText,
              legacyRefCode: request.refCode1,
              lastSyncedAt: new Date()
            }
          })
          updated++
        } else {
          // Create new
          await prisma.purchaseRequest.create({
            data: {
              legacyDocCode: request.docCode,
              legacyRefCode: request.refCode1,
              siteCode: request.siteCode,
              partyName: request.partyName,
              partyTermsText: request.partyTermsText,
              requestedPrice: request.price,
              productId: product?.id,
              barcode: request.barcode,
              productName: request.name,
              status: 'PENDING'
            }
          })
          imported++
        }
      } catch (error) {
        console.error(`Failed to process request for ${request.barcode}:`, error)
        skipped++
      }
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'IMPORT_PURCHASE_REQUESTS',
        description: `Imported ${imported} new, updated ${updated}, skipped ${skipped} purchase requests`,
        metadata: { imported, updated, skipped }
      }
    })

    revalidatePath('/admin/canvassing')

    return {
      success: true,
      data: { imported, updated, skipped },
      message: `Successfully processed: ${imported} new, ${updated} updated, ${skipped} skipped`
    }
  } catch (error) {
    console.error('Import purchase requests error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import purchase requests'
    }
  }
}

// Get all purchase requests
export async function getPurchaseRequests(filters?: {
  siteCode?: string
  status?: string
  search?: string
}): Promise<ActionResult<Array<{
  id: string
  legacyDocCode: string
  legacyRefCode: string | null
  siteCode: string
  partyName: string | null
  partyTermsText: string | null
  requestedPrice: number | null
  productId: string | null
  barcode: string
  productName: string
  status: string
  syncedAt: Date
  hasCanvassing: boolean
}>>> {
  try {
    await checkAuthorization()

    type WhereInput = {
      siteCode?: string
      status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SELECTED' | 'ORDERED' | 'CANCELLED'
      OR?: Array<{
        barcode?: { contains: string; mode: 'insensitive' }
        productName?: { contains: string; mode: 'insensitive' }
        legacyDocCode?: { contains: string; mode: 'insensitive' }
      }>
    }

    const where: WhereInput = {}

    if (filters?.siteCode) {
      where.siteCode = filters.siteCode
    }

    if (filters?.status) {
      where.status = filters.status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SELECTED' | 'ORDERED' | 'CANCELLED'
    }

    if (filters?.search) {
      where.OR = [
        { barcode: { contains: filters.search, mode: 'insensitive' } },
        { productName: { contains: filters.search, mode: 'insensitive' } },
        { legacyDocCode: { contains: filters.search, mode: 'insensitive' } }
      ]
    }

    const requests = await prisma.purchaseRequest.findMany({
      where,
      include: {
        canvassing: {
          select: { id: true }
        }
      },
      orderBy: { syncedAt: 'desc' }
    })

    const data = requests.map(req => ({
      id: req.id,
      legacyDocCode: req.legacyDocCode,
      legacyRefCode: req.legacyRefCode,
      siteCode: req.siteCode,
      partyName: req.partyName,
      partyTermsText: req.partyTermsText,
      requestedPrice: req.requestedPrice ? parseFloat(req.requestedPrice.toString()) : null,
      productId: req.productId,
      barcode: req.barcode,
      productName: req.productName,
      status: req.status,
      syncedAt: req.syncedAt,
      hasCanvassing: !!req.canvassing
    }))

    return {
      success: true,
      data
    }
  } catch (error) {
    console.error('Get purchase requests error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch purchase requests'
    }
  }
}

// Create canvassing from purchase request
export async function createCanvassing(purchaseRequestId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId } = await checkAuthorization()

    const purchaseRequest = await prisma.purchaseRequest.findUnique({
      where: { id: purchaseRequestId }
    })

    if (!purchaseRequest) {
      return {
        success: false,
        error: 'Purchase request not found'
      }
    }

    // Check if canvassing already exists
    const existing = await prisma.canvassing.findUnique({
      where: { purchaseRequestId }
    })

    if (existing) {
      return {
        success: false,
        error: 'Canvassing already exists for this purchase request'
      }
    }

    const canvassing = await prisma.canvassing.create({
      data: {
        purchaseRequestId,
        productId: purchaseRequest.productId,
        barcode: purchaseRequest.barcode,
        productName: purchaseRequest.productName,
        siteCode: purchaseRequest.siteCode,
        legacyDocCode: purchaseRequest.legacyDocCode,
        requestedPrice: purchaseRequest.requestedPrice,
        status: 'IN_PROGRESS',
        createdBy: userId
      }
    })

    // Update purchase request status
    await prisma.purchaseRequest.update({
      where: { id: purchaseRequestId },
      data: { status: 'IN_PROGRESS' }
    })

    revalidatePath('/admin/canvassing')

    return {
      success: true,
      data: { id: canvassing.id },
      message: 'Canvassing created successfully'
    }
  } catch (error) {
    console.error('Create canvassing error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create canvassing'
    }
  }
}
