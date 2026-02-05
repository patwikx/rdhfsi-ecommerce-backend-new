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
    const docCode = searchParams.get('docCode')
    const siteCode = searchParams.get('siteCode') || '001'

    if (!docCode) {
      return NextResponse.json({ error: 'Doc code is required' }, { status: 400 })
    }

    const pool = await getConnection()

    const query = `
      SELECT 
        a.barcode, 
        a.name, 
        c.docCode, 
        b.price, 
        c.siteCode, 
        c.partyName, 
        c.partyTermsText, 
        c.refCode1 
      FROM dbo.Product AS a
      INNER JOIN dbo.InventoryDocDetail AS b ON a.productCode = b.productCode
      INNER JOIN dbo.InventoryDocHeader AS c ON b.inventoryDocId = c.inventoryDocId
      WHERE c.siteCode = @siteCode
        AND c.typeCode = 'PUR'
        AND c.docCode = @docCode
        AND YEAR(c.docDate) >= 2025
      ORDER BY a.name
    `

    const result = await pool.request()
      .input('siteCode', siteCode)
      .input('docCode', docCode)
      .query(query)

    const items = result.recordset.map(row => ({
      barcode: row.barcode ? row.barcode.toString() : '',
      name: row.name || '',
      docCode: row.docCode ? row.docCode.toString() : '',
      price: row.price ? parseFloat(row.price.toString()) : 0,
      siteCode: row.siteCode ? row.siteCode.toString() : '',
      partyName: row.partyName || '',
      partyTermsText: row.partyTermsText || '',
      refCode1: row.refCode1 ? row.refCode1.toString() : ''
    }))

    return NextResponse.json({
      success: true,
      data: items
    })

  } catch (error) {
    console.error('Fetch items error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch items' 
      },
      { status: 500 }
    )
  }
}
