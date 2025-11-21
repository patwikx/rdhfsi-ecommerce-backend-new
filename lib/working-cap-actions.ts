'use server'

import { executeQuery } from '@/lib/working-cap/db'
import { DateRange } from 'react-day-picker'

export type InvoiceItem = {
  'Transaction ID': string
  BarCode: string
  Description: string
  'Retail Price': number
  Quantity: number
  'Total Amount': number
  'Invoice Date': string // String format MM-dd-yyyy from SQL FORMAT function
  SupplierName: string
  Branch: string
  Remarks: string
  CustomerName: string
  'PO #': string
  'SI #': string
  PaymentType: string
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
    // Updated query with date range filtering - using CAST to ensure date comparison works
    query = `
      SELECT
        c.barCode AS BarCode,
        c.name AS Description,
        b.retail_price as 'Retail Price',
        b.actual_quantity as 'Quantity',
        b.subtotal as 'Total Amount',
        FORMAT(a.invoice_date, 'MM-dd-yyyy') as 'Invoice Date',
        'NEW' as 'Remarks',
        ISNULL(a.party_name, '') as 'CustomerName',
        ISNULL(j.reference_code, '') as 'PO #',
        ISNULL(a.receipt_no, '') as 'SI #',
        j.payment_type_code as 'PaymentType',
        ISNULL(x.name, 'Uncategorized') as 'Category'
      FROM [dbo].invoices a WITH (NOLOCK)
        INNER JOIN [dbo].invoice_lines b WITH (NOLOCK) ON a.id = b.invoice_id
        INNER JOIN [dbo].product c WITH (NOLOCK) ON b.product_code = c.productCode
        INNER JOIN [dbo].sites d WITH (NOLOCK) ON a.site_code = d.site_code
        INNER JOIN [dbo].invoice_payments j WITH (NOLOCK) ON b.invoice_id = j.invoice_id
        LEFT JOIN [dbo].Supplier e WITH (NOLOCK) ON c.supplierId = e.supplierId
        LEFT JOIN [dbo].Category x WITH (NOLOCK) ON c.departmentId = x.categoryCode
      WHERE 
        CAST(a.invoice_date AS DATE) >= CAST(@param0 AS DATE)
        AND CAST(a.invoice_date AS DATE) <= CAST(@param1 AS DATE)
        AND a.type_code = 'POS'
        AND b.actual_quantity > 0
        AND b.subtotal > 0
        AND c.isConcession = '0'
        AND j.payment_type_code NOT IN ('EXCH', 'EWT')
        AND EXISTS (
          SELECT 1 FROM [dbo].POSDocDetail h WITH (NOLOCK)
          WHERE h.productCode = b.product_code 
          AND CAST(h.remark AS VARCHAR(MAX)) = 'NEW'
        )
      GROUP BY 
        a.transaction_id, c.barCode, c.name, b.retail_price, b.actual_quantity,
        b.subtotal, a.invoice_date, e.name, d.name, a.party_name, 
        j.reference_code, a.receipt_no, j.payment_type_code, x.name
      ORDER BY 
        a.invoice_date DESC, 
        a.transaction_id DESC
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
        const hasValidAmount = typeof item['Total Amount'] === 'number' && !isNaN(item['Total Amount'])
        const hasValidQuantity = typeof item.Quantity === 'number' && item.Quantity > 0
        
        if (!hasValidDate) {
          console.warn('Filtered out invoice record with invalid date:', item['Transaction ID'])
        }
        if (!hasValidAmount) {
          console.warn('Filtered out invoice record with invalid amount:', item['Transaction ID'])
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
function isValidDateString(dateStr: string): boolean {
  if (!dateStr || dateStr === 'null') return false
  
  // Check MM-dd-yyyy format
  const dateRegex = /^\d{2}-\d{2}-\d{4}$/
  if (!dateRegex.test(dateStr)) return false
  
  // Try to parse the date
  const date = new Date(dateStr)
  return !isNaN(date.getTime())
}

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
      paymentTypes = [...new Set(invoiceData.map(item => item.PaymentType).filter(Boolean))]
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
      totalAmount = invoiceData.reduce((sum, item) => sum + (item['Total Amount'] || 0), 0)
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