import { NextRequest, NextResponse } from 'next/server'
import { getConnection } from '@/lib/database'
import { auth } from '@/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const siteCode = searchParams.get('siteCode') || '001'

    const pool = await getConnection()

    // Get distinct doc codes from 2025 onwards
    const query = `
      SELECT DISTINCT 
        c.docCode,
        c.partyName,
        c.refCode1,
        c.docDate,
        COUNT(b.productCode) as itemCount
      FROM dbo.InventoryDocHeader AS c
      INNER JOIN dbo.InventoryDocDetail AS b ON c.inventoryDocId = b.inventoryDocId
      WHERE c.siteCode = @siteCode
        AND c.typeCode = 'PUR'
        AND YEAR(c.docDate) >= 2025
      GROUP BY c.docCode, c.partyName, c.refCode1, c.docDate
      ORDER BY c.docCode DESC
    `

    const result = await pool.request()
      .input('siteCode', siteCode)
      .query(query)

    const docCodes = result.recordset.map(row => ({
      docCode: row.docCode ? row.docCode.toString() : '',
      partyName: row.partyName || '',
      refCode1: row.refCode1 ? row.refCode1.toString() : '',
      itemCount: row.itemCount || 0,
      docDate: row.docDate ? new Date(row.docDate).toISOString() : null
    }))

    return NextResponse.json({
      success: true,
      data: docCodes
    })

  } catch (error) {
    console.error('Fetch doc codes error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch doc codes' 
      },
      { status: 500 }
    )
  }
}
