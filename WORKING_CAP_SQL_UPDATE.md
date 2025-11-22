# Working Capital SQL Query Update

## Changes Made

### 1. Updated SQL Query (lib/working-cap-actions.ts)
Replaced the old invoice query with your new SQL query that:
- Uses proper table joins (Product, POSDocDetail, POSDocHeader, invoices, invoice_payments, Category)
- Filters by site code '007'
- Excludes concession items (isConcession = '0')
- Filters for 'NEW' remarks only
- Excludes 'EXCHANGE' and 'EWT' payment types
- Orders by invoice_date ascending

### 2. Updated TypeScript Type Definition
Changed `InvoiceItem` type to match new column structure:

```typescript
export type InvoiceItem = {
  Barcode: string           // Product barcode
  Name: string              // Product name
  Quantity: number          // Quantity sold
  'Amount Paid': number     // Amount paid (was 'Total Amount')
  'Party Name': string      // Customer name (was 'CustomerName')
  Remark: string            // Transaction remark (NEW)
  'Invoice Date': string    // Date in MM-dd-yyyy format
  'PO#': string            // Purchase order reference
  'SI#': string            // Sales invoice receipt number
  'Payment Type': string    // Payment type code (was 'PaymentType')
  Category: string          // Product category
}
```

### 3. Updated Page Component (app/(dashboard)/admin/working-cap/page.tsx)
- Changed field references from 'Total Amount' to 'Amount Paid'
- Changed 'PaymentType' to 'Payment Type' (with space)
- Changed 'CustomerName' to 'Party Name'
- Changed 'Description' to 'Name'
- Updated truncation logic for display fields

### 4. Column Headers
The data table will now display proper column headers:
- **Barcode** - Product barcode
- **Name** - Product name (truncated if > 30 chars)
- **Quantity** - Quantity sold
- **Amount Paid** - Payment amount
- **Party Name** - Customer name (truncated if > 30 chars)
- **Remark** - Transaction remark
- **Invoice Date** - Date of invoice
- **PO#** - Purchase order number
- **SI#** - Sales invoice number
- **Payment Type** - Payment method
- **Category** - Product category

## No "any" Types Used
All types are properly defined with TypeScript interfaces. The only exception is the `params` array which uses `any[]` for SQL parameter binding (standard practice for database queries).

## Testing
Run the application and navigate to the Working Capital page to verify:
1. Date range selection works
2. Data loads with proper column headers
3. Filters work for Category and Payment Type
4. Export to Excel includes all new fields
5. Total amount calculation uses 'Amount Paid' field
