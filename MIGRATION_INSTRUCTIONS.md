# Database Migration Instructions

## New Fields Added to Product Model

We've added two new pricing fields to the Product model:
- `wholesalePrice` (Decimal, optional)
- `poPrice` (Decimal, optional) - Purchase Order Price

## Steps to Apply Migration

1. **Generate the migration:**
   ```bash
   npx prisma migrate dev --name add_wholesale_and_po_price
   ```

2. **Apply to production:**
   ```bash
   npx prisma migrate deploy
   ```

3. **Regenerate Prisma Client:**
   ```bash
   npx prisma generate
   ```

## What Changed

### Schema Changes (prisma/schema.prisma)
- Added `wholesalePrice Decimal? @db.Decimal(10, 2)` to Product model
- Added `poPrice Decimal? @db.Decimal(10, 2)` to Product model

### Code Changes
- Updated `app/api/inventory/sync-stream/route.ts` to fetch and sync wholesale and PO prices
- Updated `types/inventory-sync.ts` to include new price fields
- Updated `app/actions/product-actions.ts` to convert and return new price fields
- Updated `components/admin/scanner/qr-scanner.tsx` to display wholesale and PO prices

### SQL Query Updated
The sync query now fetches:
- `a.wholesalePrice as [Wholesale Price]`
- `a.price4 as [PO Price]`

## Testing

After migration, test:
1. Run inventory sync from `/admin/inventory/sync`
2. Scan a product QR code at `/admin/scanner`
3. Verify wholesale and PO prices are displayed correctly
