'use server'

import { executeQuery } from '@/lib/working-cap/db'
import { DateRange } from 'react-day-picker'

export type InvoiceItem = {
  Barcode: string
  Name: string
  Quantity: number
  'Amount Paid': number
  'Party Name': string
  Remark: string
  'Invoice Date': string
  'PO#': string
  'SI#': string
  'Payment Type': string
  Category: string
}

export type InventoryItem = {
  'RR#': string
  Barcode: string
  Description: string
  Quantity: number
  Cost: number
  'Total Gross': number
  Remarks: string
  'Posting Date': Date
  Supplier: string
  Site: string
}

export type DataType = 'invoices' | 'inventory'

export async function fetchData(dataType: DataType, dateRange?: DateRange | null): Promise<InvoiceItem[] | InventoryItem[]> {
  // Return empty array if no date range is provided
  if (!dateRange?.from) {
    console.log('No date range provided, returning empty array')
    return []
  }

  let query: string
  let params: any[] = []

  // Format dates for SQL Server - use local date parts to avoid timezone issues
  const formatDateForSQL = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const startDate = formatDateForSQL(dateRange.from)
  const endDate = dateRange.to ? formatDateForSQL(dateRange.to) : startDate

  console.log('Date filtering:', { 
    originalFrom: dateRange.from, 
    originalTo: dateRange.to,
    startDate, 
    endDate 
  })

  if (dataType === 'invoices') {
    // Updated query with date range filtering
    query = `
      SELECT 
        a.barcode AS Barcode, 
        a.name AS Name, 
        b.quantity AS Quantity, 
        b.subTotal AS 'Amount Paid', 
        d.party_name AS 'Party Name', 
        CAST(b.remark AS VARCHAR(MAX)) AS Remark, 
        FORMAT(d.invoice_date, 'MM-dd-yyyy') AS 'Invoice Date', 
        f.reference_code AS 'PO#', 
        d.receipt_no AS 'SI#', 
        f.payment_type_code AS 'Payment Type', 
        g.name AS Category 
      FROM dbo.Product AS a WITH (NOLOCK)
        LEFT JOIN dbo.POSDocDetail AS b WITH (NOLOCK) ON a.productCode = b.productCode
        LEFT JOIN dbo.POSDocHeader AS c WITH (NOLOCK) ON b.inventoryDocId = c.inventoryDocId
        LEFT JOIN dbo.invoices AS d WITH (NOLOCK) ON b.inventoryDocId = d.document_no
        LEFT JOIN dbo.invoice_payments AS f WITH (NOLOCK) ON b.inventoryDocId = f.invoice_id
        LEFT JOIN dbo.Category AS g WITH (NOLOCK) ON a.departmentId = g.categoryId
      WHERE 
        c.typeCode = 'POS'
        AND c.siteCode = '007'
        AND a.isConcession = '0'
AND CAST(b.remark AS VARCHAR(MAX)) IN ('NEW', 'NEW - CHARGE', 'NEW - CASH')
        AND f.payment_type_code NOT IN ('EXCHANGE', 'EWT')
        AND CAST(d.invoice_date AS DATE) >= CAST(@param0 AS DATE)
        AND CAST(d.invoice_date AS DATE) <= CAST(@param1 AS DATE)
      ORDER BY 
        d.invoice_date ASC
    `
    params.push(startDate, endDate)
  } else {
    // Updated inventory query with date range filtering
    query = `
      SELECT TOP 5000
        I.[docCode] as 'RR#',
        ISNULL(D.barcode, '') as 'Barcode',
        ISNULL(P.name, 'Unknown Product') as 'Description',
        ISNULL(D.[quantity], 0) as 'Quantity',
        ISNULL(P.landedCost, 0) as 'Cost',
        ISNULL(D.subTotal, 0) as 'Total Gross',
        ISNULL(I.remark, '') as 'Remarks',
        I.[postDate] as 'Posting Date',
        ISNULL(I.partyName, 'Unknown Supplier') as 'Supplier',
        ISNULL(S.name, 'Unknown Site') as 'Site'
      FROM [rddb].[dbo].[InventoryDocHeader] I WITH (NOLOCK)
        INNER JOIN [rddb].[dbo].[InventoryDocDetail] D WITH (NOLOCK) ON I.inventoryDocId = D.inventoryDocId
        LEFT JOIN [rddb].[dbo].[Product] P WITH (NOLOCK) ON D.barcode = P.barCode
        LEFT JOIN [rddb].[dbo].[Site] S WITH (NOLOCK) ON I.originSiteCode = S.siteCode
      WHERE 
        CAST(I.[postDate] AS DATE) >= CAST(@param0 AS DATE)
        AND CAST(I.[postDate] AS DATE) <= CAST(@param1 AS DATE)
        AND I.transCode = 'REC' 
        AND I.typeCode = 'DEL' 
        AND D.lineNumber > 0 
        AND ISNULL(S.name, 'Main Warehouse') = 'Main Warehouse'
        AND D.subTotal > 0
        AND I.status = 'P'
      ORDER BY 
        I.postDate DESC, 
        I.docCode DESC
    `
    params.push(startDate, endDate)
  }

  try {
    console.log(`Fetching ${dataType} data from ${startDate} to ${endDate}...`)
    const startTime = Date.now()
    
    const result = await executeQuery(query, params)
    
    const endTime = Date.now()
    console.log(`Successfully fetched ${result.length} ${dataType} records in ${endTime - startTime}ms`)
    
    // Log sample of data for debugging
    if (result.length > 0) {
      console.log(`Sample ${dataType} record:`, result[0])
    }
    
    // Type assertion and validation
    if (dataType === 'invoices') {
      const invoiceData = result as InvoiceItem[]
      
      // Validate and clean data
      const cleanedData = invoiceData.filter(item => {
        // Filter out records with invalid data
        const hasValidDate = item['Invoice Date'] && item['Invoice Date'] !== 'null'
        const hasValidAmount = typeof item['Amount Paid'] === 'number' && !isNaN(item['Amount Paid'])
        const hasValidQuantity = typeof item.Quantity === 'number' && item.Quantity > 0
        
        if (!hasValidDate) {
          console.warn('Filtered out invoice record with invalid date:', item.Barcode)
        }
        if (!hasValidAmount) {
          console.warn('Filtered out invoice record with invalid amount:', item.Barcode)
        }
        
        return hasValidDate && hasValidAmount && hasValidQuantity
      })
      
      console.log(`Cleaned invoice data: ${cleanedData.length} valid records out of ${invoiceData.length} total`)
      return cleanedData
      
    } else {
      const inventoryData = result as InventoryItem[]
      
      // Validate and clean inventory data
      const cleanedData = inventoryData.filter(item => {
        const hasValidDate = item['Posting Date'] instanceof Date || 
                           (typeof item['Posting Date'] === 'string' && item['Posting Date'] !== 'null')
        const hasValidAmount = typeof item['Total Gross'] === 'number' && !isNaN(item['Total Gross'])
        const hasValidQuantity = typeof item.Quantity === 'number' && item.Quantity > 0
        
        if (!hasValidDate) {
          console.warn('Filtered out inventory record with invalid date:', item['RR#'])
        }
        if (!hasValidAmount) {
          console.warn('Filtered out inventory record with invalid amount:', item['RR#'])
        }
        
        return hasValidDate && hasValidAmount && hasValidQuantity
      })
      
      console.log(`Cleaned inventory data: ${cleanedData.length} valid records out of ${inventoryData.length} total`)
      return cleanedData
    }
    
  } catch (error) {
    console.error(`Error fetching ${dataType} data:`, error)
    
    // Log the actual SQL query for debugging
    console.error('Query that failed:', query)
    console.error('Parameters:', params)
    
    throw new Error(`Failed to fetch ${dataType} data: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Helper function to validate date strings

// Helper function to get unique values for filters - now requires date range
export async function getFilterOptions(dataType: DataType, dateRange?: DateRange | null): Promise<{
  categories: string[]
  paymentTypes: string[]
}> {
  try {
    const data = await fetchData(dataType, dateRange)
    
    let categories: string[] = []
    let paymentTypes: string[] = []
    
    if (dataType === 'invoices') {
      const invoiceData = data as InvoiceItem[]
      categories = [...new Set(invoiceData.map(item => item.Category).filter(Boolean))]
      paymentTypes = [...new Set(invoiceData.map(item => item['Payment Type']).filter(Boolean))]
    }
    
    return {
      categories: categories.sort(),
      paymentTypes: paymentTypes.sort()
    }
  } catch (error) {
    console.error('Error getting filter options:', error)
    return {
      categories: [],
      paymentTypes: []
    }
  }
}

// Helper function to get data summary statistics - now requires date range
export async function getDataSummary(dataType: DataType, dateRange?: DateRange | null): Promise<{
  totalRecords: number
  dateRange: { earliest: string; latest: string } | null
  totalAmount: number
}> {
  try {
    const data = await fetchData(dataType, dateRange)
    
    if (data.length === 0) {
      return {
        totalRecords: 0,
        dateRange: null,
        totalAmount: 0
      }
    }
    
    let totalAmount = 0
    let dates: Date[] = []
    
    if (dataType === 'invoices') {
      const invoiceData = data as InvoiceItem[]
      totalAmount = invoiceData.reduce((sum, item) => sum + (item['Amount Paid'] || 0), 0)
      dates = invoiceData
        .map(item => new Date(item['Invoice Date']))
        .filter(date => !isNaN(date.getTime()))
    } else {
      const inventoryData = data as InventoryItem[]
      totalAmount = inventoryData.reduce((sum, item) => sum + (item['Total Gross'] || 0), 0)
      dates = inventoryData
        .map(item => item['Posting Date'] instanceof Date ? item['Posting Date'] : new Date(item['Posting Date']))
        .filter(date => !isNaN(date.getTime()))
    }
    
    const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime())
    
    return {
      totalRecords: data.length,
      dateRange: sortedDates.length > 0 ? {
        earliest: sortedDates[0].toLocaleDateString('en-US', { 
          month: '2-digit', 
          day: '2-digit', 
          year: 'numeric' 
        }).replace(/\//g, '-'),
        latest: sortedDates[sortedDates.length - 1].toLocaleDateString('en-US', { 
          month: '2-digit', 
          day: '2-digit', 
          year: 'numeric' 
        }).replace(/\//g, '-')
      } : null,
      totalAmount
    }
  } catch (error) {
    console.error('Error getting data summary:', error)
    return {
      totalRecords: 0,
      dateRange: null,
      totalAmount: 0
    }
  }
}