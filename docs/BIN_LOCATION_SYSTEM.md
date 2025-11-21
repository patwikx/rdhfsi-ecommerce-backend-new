# Enterprise Bin/Shelf Location Tracking System

## Overview
A comprehensive warehouse bin location system that allows tracking inventory at the shelf level with QR code scanning capabilities.

## System Architecture

### Hierarchy Structure
```
Site (Warehouse/Store)
  └── Zone (Optional grouping: Receiving, Storage, Picking)
      └── Aisle (A1, A2, B1, etc.)
          └── Shelf/Bin (A1-S1-L1, A1-S1-L2, etc.)
              └── BinInventory (Product quantities)
```

## Core Features

### 1. **Multi-Level Location Tracking**
- **Zones**: Logical grouping (Receiving, Picking, Storage, Cold Storage)
- **Aisles**: Physical aisles within zones
- **Shelves**: Individual storage locations with QR codes
- **Bins**: Same as shelves (interchangeable terms)

### 2. **Split Inventory Across Bins**
**Example: 100 Paint Cans**
```
Shelf A1-S1: 50 cans (Primary picking location)
Shelf B2-S3: 30 cans (Bulk storage)
Shelf C1-S2: 20 cans (Overflow)
Total: 100 cans
```

Each bin tracks:
- Quantity in that specific location
- Reserved quantity (for pending orders)
- Available quantity
- Priority (which bin to pick from first)
- Batch/lot numbers (optional)
- Expiry dates (optional)

### 3. **QR Code Scanning**
Each shelf has a unique QR code that contains:
- Shelf ID
- Location code (e.g., "A1-S1-L2")
- Site information

**When scanned:**
1. Shows all products on that shelf
2. Displays quantities (total, reserved, available)
3. Shows batch/lot information
4. Allows quick actions:
   - Pick items
   - Move items
   - Count items
   - View history

### 4. **Bin Movement Tracking**
Track all movements between bins:
- **PUTAWAY**: Receiving → Shelf
- **PICK**: Shelf → Order
- **REPLENISHMENT**: Bulk storage → Picking location
- **RELOCATION**: Shelf A → Shelf B
- **CYCLE_COUNT**: Adjustments from physical counts
- **CONSOLIDATION**: Combining partial bins
- **RETURN**: Customer return → Shelf

### 5. **Picking Strategy**
**Primary vs Secondary Locations:**
```sql
-- Product: Paint Can (100 total)
Shelf A1-S1: 50 cans (isPrimary: true, priority: 1)  ← Pick from here first
Shelf B2-S3: 30 cans (isPrimary: false, priority: 2) ← Pick if primary empty
Shelf C1-S2: 20 cans (isPrimary: false, priority: 3) ← Last resort
```

System automatically:
- Picks from primary location first
- Falls back to secondary locations
- Suggests replenishment when primary is low

### 6. **Cycle Counting**
Schedule and perform physical inventory counts:
- Count by shelf, aisle, zone, or product
- Track variances (system vs actual)
- Automatic adjustment creation
- Manager verification workflow

## Use Cases

### Use Case 1: Receiving Stock
```
1. Receive 100 paint cans
2. Scan receiving area QR
3. System suggests putaway locations:
   - 50 to A1-S1 (primary picking)
   - 50 to B2-S3 (bulk storage)
4. Scan destination shelf QR
5. Confirm quantity
6. System updates:
   - BinInventory records
   - Overall Inventory
   - Creates BinMovement records
```

### Use Case 2: Picking for Order
```
1. Order requires 60 paint cans
2. System generates pick list:
   - Pick 50 from A1-S1 (primary)
   - Pick 10 from B2-S3 (secondary)
3. Worker scans A1-S1 QR
4. Confirms picking 50 cans
5. Scans B2-S3 QR
6. Confirms picking 10 cans
7. System updates:
   - Reduces quantity in both bins
   - Creates BinMovement records
   - Triggers replenishment alert for A1-S1
```

### Use Case 3: Replenishment
```
1. Primary location (A1-S1) is low (5 cans remaining)
2. System suggests replenishment from B2-S3
3. Worker scans B2-S3 QR (source)
4. Scans A1-S1 QR (destination)
5. Moves 45 cans
6. System updates both bins
7. A1-S1 now has 50 cans (fully stocked)
```

### Use Case 4: Cycle Count
```
1. Schedule count for Aisle A1
2. Assign to warehouse staff
3. Staff scans each shelf QR in A1
4. Enters actual counted quantity
5. System calculates variance
6. Manager reviews and approves
7. System adjusts inventory
```

### Use Case 5: Finding Product Location
```
1. Search for "Paint Can"
2. System shows:
   - Total: 100 cans
   - Locations:
     * A1-S1: 50 cans (Primary)
     * B2-S3: 30 cans
     * C1-S2: 20 cans
3. Click location to see map
4. Generate QR code for navigation
```

## Database Schema Highlights

### BinInventory (Core Table)
```prisma
model BinInventory {
  shelfId   String   // Which shelf
  productId String   // Which product
  quantity  Decimal  // How many
  
  isPrimary Boolean  // Primary picking location?
  priority  Int      // Pick order
  
  batchNumber String? // Optional batch tracking
  expiryDate  DateTime? // Optional expiry tracking
}
```

### Shelf (Location Table)
```prisma
model Shelf {
  code     String  @unique // "A1-S1-L2"
  qrCode   String  @unique // For scanning
  
  level    Int?    // Shelf level (1=bottom, 3=top)
  position Int?    // Position in aisle
  
  maxWeight  Decimal? // Capacity limits
  maxVolume  Decimal?
  
  isAccessible Boolean // Can be blocked for maintenance
}
```

## Benefits

### Operational Benefits
✅ **Faster Picking** - Know exactly where items are
✅ **Reduced Errors** - QR scanning ensures accuracy
✅ **Better Space Utilization** - Track capacity per shelf
✅ **Efficient Replenishment** - Automatic alerts
✅ **Accurate Inventory** - Bin-level tracking
✅ **Audit Trail** - Complete movement history

### Enterprise Features
✅ **Multi-site Support** - Different warehouses
✅ **Zone Management** - Temperature zones, security zones
✅ **Batch/Lot Tracking** - For regulated products
✅ **Expiry Management** - FEFO (First Expired, First Out)
✅ **Cycle Counting** - Continuous inventory accuracy
✅ **Capacity Planning** - Weight and volume limits

## Mobile App Features (Future)

### Warehouse Worker App
- Scan QR codes
- View bin contents
- Pick items for orders
- Move items between bins
- Perform cycle counts
- View pick lists

### Manager Dashboard
- View warehouse map
- Monitor bin utilization
- Review cycle count variances
- Approve adjustments
- Generate reports

## Reporting Capabilities

1. **Bin Utilization Report** - Which bins are full/empty
2. **Slow-Moving Inventory by Bin** - Identify dead stock
3. **Pick Efficiency Report** - Time per pick by location
4. **Cycle Count Accuracy** - Variance trends
5. **Replenishment Report** - Items needing restocking
6. **Bin Movement History** - Audit trail

## Implementation Phases

### Phase 1: Basic Bin Tracking
- Create shelves with QR codes
- Assign inventory to bins
- Basic scanning functionality

### Phase 2: Movement Tracking
- Track picks and putaways
- Bin-to-bin movements
- Movement history

### Phase 3: Advanced Features
- Cycle counting
- Replenishment automation
- Batch/lot tracking
- Expiry management

### Phase 4: Mobile App
- QR scanning app
- Pick list management
- Real-time updates

## Next Steps

1. **Add to Prisma Schema** - Integrate the bin location models
2. **Generate Migration** - Create database tables
3. **Build Admin UI** - Manage shelves and bins
4. **Create QR Codes** - Generate and print QR codes
5. **Build Scanning Interface** - Web or mobile app
6. **Implement Pick Logic** - Automatic bin selection
7. **Add Reporting** - Bin utilization and movement reports

Would you like me to proceed with implementing any of these phases?
