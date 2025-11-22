# Migration Commands for Order Taker System

## Run These Commands in Order:

### 1. Create and Apply Migration
```bash
npx prisma migrate dev --name add_order_taker_system
```

This will:
- Create a new migration file in `prisma/migrations/`
- Apply the migration to your database
- Generate the Prisma Client with new types

### 2. Verify Migration (Optional)
```bash
npx prisma studio
```

This opens Prisma Studio where you can:
- See the new `OrderDraft` table
- See the new `OrderDraftItem` table
- See the new `SalesmanPerformance` table
- Verify new fields in `Order` table

### 3. If Migration Fails

If you get errors, you can:

**Reset and try again:**
```bash
npx prisma migrate reset
npx prisma migrate dev --name add_order_taker_system
```

**Or create migration without applying:**
```bash
npx prisma migrate dev --create-only --name add_order_taker_system
```
Then manually edit the migration SQL file before applying.

## What Was Added

### New Tables:
- `OrderDraft` - Draft orders created by salesmen
- `OrderDraftItem` - Line items in draft orders
- `SalesmanPerformance` - Performance tracking per salesman

### Modified Tables:
- `Order` - Added salesman tracking fields
- `User` - Added relations for order drafts and performance

### New Enums:
- `OrderSource` - ONLINE, WALK_IN, PHONE, WHOLESALE
- `DraftStatus` - IN_PROGRESS, SENT_TO_CASHIER, COMPLETED, CANCELLED

## After Migration

The Prisma Client will have new types available:
- `prisma.orderDraft.create()`
- `prisma.orderDraftItem.create()`
- `prisma.salesmanPerformance.create()`
- `OrderSource` enum
- `DraftStatus` enum

You can now build the order-taker UI and server actions!
