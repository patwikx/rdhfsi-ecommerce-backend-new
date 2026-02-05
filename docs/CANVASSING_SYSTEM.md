# Canvassing / Price Comparison System

## Overview
The canvassing system allows you to fetch purchase requests from the legacy system and compare prices from multiple suppliers/competitors before making a purchase decision.

## Implementation Status: ✅ COMPLETED

The simplified canvassing system has been fully implemented with the following features:
- Document-based structure (one canvassing per purchase request)
- Fetch purchase requests from legacy system
- Enter competitor pricing for each item
- View canvassing list with pagination and filtering
- View detailed canvassing with price comparisons and savings calculations
- Full CRUD operations with proper authorization

## Database Schema (Simplified)

### 1. Canvassing Model
Main canvassing document for a purchase request.

**Fields:**
- `id` - UUID primary key
- `legacyDocCode` - Document code from legacy system (unique)
- `legacyRefCode` - Reference code from legacy
- `siteCode` - Site code (e.g., '001')
- `partyName` - Original supplier name
- `partyTermsText` - Original payment terms
- `status` - IN_PROGRESS, COMPLETED, CANCELLED
- `notes` - Additional notes
- `createdBy` - User who created the canvassing
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

**Relations:**
- `items` - One-to-many with CanvassingItem
- `creator` - Many-to-one with User

### 2. CanvassingItem Model
Individual items within a canvassing document.

**Fields:**
- `id` - UUID primary key
- `canvassingId` - Foreign key to Canvassing
- `productId` - Optional link to Product (matched by barcode)
- `barcode` - Product barcode
- `productName` - Product name
- `originalPrice` - Original price from purchase request
- `supplierName` - Competitor/supplier name
- `supplierPrice` - Competitor's quoted price
- `paymentTerms` - Payment terms offered by supplier
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

**Relations:**
- `canvassing` - Many-to-one with Canvassing
- `product` - Many-to-one with Product (optional)

## Legacy System Integration

### Source SQL Query
Fetches purchase requests from the legacy system:

```sql
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
WHERE c.siteCode = '001'
  AND c.typeCode = 'PUR'
ORDER BY c.docCode DESC
```

### API Endpoints

**GET /api/canvassing/doc-codes**
- Fetches available purchase request document codes
- Groups items by docCode
- Returns: docCode, partyName, refCode1, itemCount, docDate

**GET /api/canvassing/items**
- Fetches items for a specific docCode
- Returns: barcode, name, price, partyName, partyTermsText, etc.

## User Workflow

### 1. Create New Canvassing
1. Navigate to `/admin/canvassing`
2. Click "New Canvassing" button
3. Select a purchase request doc code from dropdown
4. System loads all items from that purchase request
5. Original supplier and terms are displayed

### 2. Enter Competitor Pricing
1. For each item in the table:
   - Enter up to 3 different suppliers
   - For each supplier: name and quoted price
   - Payment terms can be added later in the detail view
2. Can enter 1, 2, or 3 suppliers per item
3. Can skip items without competitor quotes
4. Must enter at least one supplier for at least one item

### 3. Save Canvassing
1. Click "Save Canvassing" button
2. System validates data
3. Creates Canvassing document with all items
4. Redirects to canvassing list

### 4. View Canvassing Details
1. From list page, click "View" on any canvassing
2. See summary cards showing:
   - Original total price
   - Best supplier total price (lowest from all suppliers)
   - Total savings (amount and percentage)
3. View detailed comparison table with:
   - Product information
   - All 3 suppliers side-by-side
   - Best price highlighted in green
   - Price difference with visual indicators
   - Payment terms for each supplier
   - Best savings calculation per item

## Status Flow

```
IN_PROGRESS → COMPLETED
       ↓
   CANCELLED
```

- **IN_PROGRESS**: Actively comparing prices (default status)
- **COMPLETED**: Price comparison finished, decision made
- **CANCELLED**: Canvassing cancelled or no longer needed

## Key Features

1. **Legacy System Integration**: Fetches purchase requests directly from legacy database
2. **Document-Based Structure**: One canvassing per purchase request doc code
3. **Real-Time Data**: Loads items dynamically from legacy system
4. **Multi-Supplier Comparison**: Compare up to 3 suppliers per item
5. **Side-by-Side View**: All suppliers displayed in one table for easy comparison
6. **Best Price Highlighting**: Automatically highlights the lowest price in green
7. **Savings Calculation**: Automatic calculation of best savings per item and total
8. **Visual Indicators**: Color-coded best prices and savings indicators
9. **Flexible Entry**: Can enter 1-3 suppliers per item, or skip items
10. **Full-Width Layout**: Maximizes screen space for better data visibility
11. **Pagination**: List view with pagination for large datasets
12. **Search & Filter**: Search by doc code or supplier, filter by status
13. **Authorization**: Admin and Manager roles only
14. **Audit Trail**: Tracks who created each canvassing

## Pages & Components

### List Page (`/admin/canvassing`)
- **File**: `app/(dashboard)/admin/canvassing/page.tsx`
- **Features**:
  - Paginated table of all canvassings
  - Search by doc code or supplier name
  - Filter by status (All, In Progress, Completed, Cancelled)
  - Shows doc code, supplier, item count, status, created date
  - "New Canvassing" button
  - "View" button for each canvassing

### New Canvassing Page (`/admin/canvassing/new`)
- **File**: `app/(dashboard)/admin/canvassing/new/page.tsx`
- **Features**:
  - Searchable dropdown for doc code selection
  - Displays original supplier and terms
  - Dynamic table of items loaded from legacy system
  - Inline editing for supplier name, price, and terms
  - Validation before save
  - Real-time loading states

### Detail Page (`/admin/canvassing/[id]`)
- **File**: `app/(dashboard)/admin/canvassing/[id]/page.tsx`
- **Features**:
  - Summary cards with totals and savings
  - Purchase request information display
  - Detailed comparison table
  - Visual indicators for price differences
  - Percentage savings calculation
  - Read-only view

## Server Actions

### `saveCanvassing()`
- **File**: `app/actions/canvassing-simple-actions.ts`
- Creates Canvassing document
- Creates CanvassingItem records
- Validates duplicate doc codes
- Matches products by barcode
- Logs activity
- Revalidates cache

### `getCanvassings()`
- **File**: `app/actions/canvassing-simple-actions.ts`
- Fetches paginated list
- Supports search and status filtering
- Returns item counts
- Sorted by creation date (newest first)

### `getCanvassingById()`
- **File**: `app/actions/canvassing-simple-actions.ts`
- Fetches single canvassing with all items
- Includes all details for display
- Handles decimal conversions

## API Routes

### GET `/api/canvassing/doc-codes`
- **File**: `app/api/canvassing/doc-codes/route.ts`
- Fetches available purchase request doc codes
- Groups by docCode with item counts
- Filters by siteCode and typeCode='PUR'
- Returns formatted data for dropdown

### GET `/api/canvassing/items`
- **File**: `app/api/canvassing/items/route.ts`
- Fetches items for specific docCode
- Joins Product, InventoryDocDetail, InventoryDocHeader
- Returns all item details including prices and terms
- Handles type conversions from legacy database

## Navigation

The canvassing system is accessible from the sidebar under "Operations" section:
- **Icon**: FileText
- **Label**: "Canvassing"
- **URL**: `/admin/canvassing`
- **Roles**: Admin, Manager, Staff

## Future Enhancements

Potential features for future development:
1. Status update functionality (mark as completed/cancelled)
2. Export to Excel/PDF
3. Bulk import of supplier quotes
4. Integration with purchase order creation
5. Email notifications to suppliers
6. Historical price tracking
7. Supplier performance metrics
8. Multi-supplier comparison (more than one supplier per item)
9. Approval workflow
10. Comments/notes per item
