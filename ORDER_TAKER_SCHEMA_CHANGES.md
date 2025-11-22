# Order Taker / POS System - Schema Changes

## Overview
Added database schema support for a salesman order-taking workflow where staff can create orders for walk-in customers, send them to cashier for payment processing, and track sales performance for incentives.

## Schema Changes Made

### 1. Updated `User` Model
Added new relations:
- `salesmanOrders` - Orders taken by this salesman
- `orderDrafts` - Draft orders created by this salesman
- `salesmanPerformance` - Performance tracking records

### 2. Updated `Order` Model
Added new fields for order-taker workflow:

```prisma
// Salesman/Order Taker tracking
salesmanId      String?       // Staff member who took the order
salesman        User?         // Relation to salesman
orderSource     OrderSource   // ONLINE, WALK_IN, PHONE, WHOLESALE
sentToCashierAt DateTime?     // When salesman sent to cashier
sentToCashierBy String?       // Salesman who sent it
processedBy     String?       // Cashier who processed payment
processedAt     DateTime?     // When cashier processed it
```

Added indexes:
- `@@index([salesmanId])`
- `@@index([orderSource])`

### 3. New `OrderSource` Enum
```prisma
enum OrderSource {
  ONLINE      // E-commerce website
  WALK_IN     // In-store with salesman
  PHONE       // Phone order
  WHOLESALE   // Wholesale/corporate order
}
```

### 4. New `OrderDraft` Model
Stores in-progress orders before sending to cashier:

```prisma
model OrderDraft {
  id          String      @id @default(cuid())
  draftNumber String      @unique
  salesmanId  String      // Who is creating this order
  siteId      String      // Which store
  
  // Customer info (optional for walk-in)
  customerName  String?
  customerPhone String?
  customerEmail String?
  
  status      DraftStatus @default(IN_PROGRESS)
  
  // Totals
  subtotal    Decimal     @default(0)
  totalAmount Decimal     @default(0)
  
  notes       String?
  
  createdAt          DateTime
  updatedAt          DateTime
  sentToCashierAt    DateTime?
  convertedToOrderId String?
  
  items OrderDraftItem[]
}
```

### 5. New `OrderDraftItem` Model
Line items for draft orders:

```prisma
model OrderDraftItem {
  id        String      @id @default(cuid())
  draftId   String
  productId String
  
  quantity  Int
  unitPrice Decimal
  subtotal  Decimal
  
  notes     String?     // Special instructions
  
  createdAt DateTime
  updatedAt DateTime
}
```

### 6. New `DraftStatus` Enum
```prisma
enum DraftStatus {
  IN_PROGRESS      // Salesman still adding items
  SENT_TO_CASHIER  // Waiting at cashier
  COMPLETED        // Converted to order
  CANCELLED        // Cancelled by salesman
}
```

### 7. New `SalesmanPerformance` Model
Track sales performance for incentives:

```prisma
model SalesmanPerformance {
  id         String   @id @default(cuid())
  salesmanId String
  
  // Period
  periodStart DateTime
  periodEnd   DateTime
  
  // Metrics
  totalOrders       Int     @default(0)
  totalRevenue      Decimal @default(0)
  totalItems        Int     @default(0)
  averageOrderValue Decimal @default(0)
  
  // Commission
  commissionRate   Decimal?  // Percentage
  commissionEarned Decimal?
  commissionPaid   Boolean   @default(false)
  commissionPaidAt DateTime?
  
  createdAt DateTime
  updatedAt DateTime
}
```

## Workflow

### Salesman Flow:
1. **Create Draft** - Salesman creates `OrderDraft` with status `IN_PROGRESS`
2. **Add Items** - Add products as `OrderDraftItem` records
3. **Send to Cashier** - Update status to `SENT_TO_CASHIER`, set `sentToCashierAt`
4. **Cashier Processes** - Cashier converts draft to `Order`, sets `processedBy` and `processedAt`
5. **Track Performance** - System updates `SalesmanPerformance` records

### Data Flow:
```
OrderDraft (IN_PROGRESS)
    ↓ (salesman adds items)
OrderDraft (SENT_TO_CASHIER)
    ↓ (cashier processes)
Order (with salesmanId, processedBy)
    ↓ (system tracks)
SalesmanPerformance (updated metrics)
```

## Migration Steps

1. **Run Prisma Migration:**
   ```bash
   npx prisma migrate dev --name add_order_taker_system
   ```

2. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

3. **Verify Migration:**
   ```bash
   npx prisma studio
   ```

## Next Steps

After running the migration:

1. **Create Server Actions** (`app/actions/order-draft-actions.ts`)
   - `createOrderDraft()` - Create new draft
   - `addItemToDraft()` - Add product to draft
   - `removeItemFromDraft()` - Remove product
   - `updateDraftItem()` - Update quantity
   - `sendDraftToCashier()` - Mark as sent
   - `convertDraftToOrder()` - Cashier converts to order
   - `getSalesmanDrafts()` - Get salesman's drafts
   - `getCashierQueue()` - Get drafts waiting at cashier

2. **Build UI Components**
   - Salesman order-taking interface
   - Cashier queue/processing interface
   - Sales performance dashboard
   - Commission reports

3. **Add Printing Support**
   - Order slip template with salesman name
   - Print queue management
   - Receipt printer integration

## Benefits

✅ **Track Salesman Performance** - Know who's selling what
✅ **Incentive Management** - Calculate commissions automatically
✅ **Workflow Separation** - Salesman takes order, cashier handles payment
✅ **Audit Trail** - Complete tracking of who did what
✅ **Queue Management** - Cashier sees all pending orders
✅ **Customer Service** - Faster checkout with pre-prepared orders
