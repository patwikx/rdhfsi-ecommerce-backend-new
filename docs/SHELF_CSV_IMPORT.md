# Shelf CSV Import Feature

## Overview
The CSV import feature allows bulk addition of products to shelves by uploading a CSV file containing barcodes and quantities.

## How It Works

### 1. CSV Format
The CSV file should contain two columns:
- **Barcode**: The product barcode (must match existing products)
- **Quantity**: The quantity to add to the shelf

Example:
```csv
Barcode,Quantity
8850123456789,10
8850987654321,5
8851234567890,15
```

### 2. Import Process
1. Navigate to the shelf detail page
2. Go to the "Available Products to Add" tab
3. Click the "Import CSV" button
4. Select your CSV file
5. Click "Import Products"

### 3. Real-Time Progress
- The import processes items one by one
- Progress bar shows current status (e.g., "23/100")
- Each item is validated and processed individually
- Results are displayed in real-time

### 4. Validation Rules
The system validates each item against:
- **Product Existence**: Barcode must match an existing product
- **Site Availability**: Product must be available at the shelf's site
- **Quantity Check**: Requested quantity cannot exceed available unassigned inventory

### 5. Import Results
Each item will have one of three statuses:

#### Success ✓
- Product was successfully added to the shelf
- Quantity was within available limits
- If product already exists on shelf, quantity is added to existing amount

#### Warning ⚠
- Product found but requested quantity exceeds available quantity
- Shows: Available vs Requested amounts
- Item is NOT added to shelf

#### Error ✗
- Product not found by barcode
- Product not available at this site
- Other processing errors

### 6. Summary
After import completes, you'll see:
- Total items processed
- Success count (green badge)
- Warning count (yellow badge)
- Error count (red badge)

## Features

### Automatic Lookup
- System automatically finds products by barcode
- Matches against available products at the shelf's site
- No need to manually search for each product

### Quantity Validation
- Calculates unassigned quantity (site available - already on shelves)
- Prevents over-allocation
- Shows clear warnings when quantity exceeds available

### Smart Updates
- If product already exists on shelf, adds to existing quantity
- If product is new to shelf, creates new bin inventory entry
- Maintains data integrity throughout

### Activity Logging
- All imports are logged with summary statistics
- Tracks success/error/warning counts
- Includes timestamp and user information

## Best Practices

1. **Prepare Your CSV**
   - Use the template download feature
   - Ensure barcodes are accurate
   - Verify quantities before import

2. **Check Available Inventory**
   - Review site inventory before importing
   - Ensure products are available at the shelf's site
   - Consider existing shelf allocations

3. **Review Results**
   - Check all warnings and errors after import
   - Address any failed items
   - Verify shelf inventory after import

4. **Handle Warnings**
   - Items with warnings are NOT added
   - Adjust quantities in CSV and re-import
   - Or manually add with correct quantities

## Technical Details

### Server Action
- `importProductsToShelf()` in `app/actions/shelf-actions.ts`
- Processes items sequentially for data integrity
- Returns detailed results for each item

### Component
- `CSVImportDialog` in `components/admin/inventory/csv-import-dialog.tsx`
- Handles file upload and parsing
- Manages progress animation
- Displays real-time results

### Database Operations
- Creates or updates `BinInventory` records
- Validates against `Inventory` table
- Logs to `ActivityLog` table
