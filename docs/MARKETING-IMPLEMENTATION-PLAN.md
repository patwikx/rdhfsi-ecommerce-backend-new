# Marketing & Promotions - Implementation Plan

## Overview
Complete marketing and promotions system for managing discounts, coupons, and promotional banners.

## Components to Build

### 1. Discount Types Management (`/admin/marketing/discounts`)

**Features:**
- List all discount types (Senior, PWD, Employee, Manager, etc.)
- Create/Edit/Delete discount types
- Toggle active/inactive status
- Set discount percentage or fixed amount
- Configure verification requirements
- Set usage limits and date ranges
- Priority ordering for multiple discounts

**Files to Create:**
- `app/(dashboard)/admin/marketing/discounts/page.tsx` - List page
- `components/admin/marketing/discount-list.tsx` - Table component
- `components/admin/marketing/discount-form-dialog.tsx` - Create/Edit modal
- `app/actions/discount-actions.ts` - ✅ CREATED

**Table Columns:**
- Code (SENIOR, PWD, EMPLOYEE)
- Name
- Discount (% or fixed amount)
- Requires Verification
- Usage Count / Limit
- Valid Dates
- Status (Active/Inactive)
- Actions (Edit, Delete, Toggle)

### 2. Coupons Management (`/admin/marketing/coupons`)

**Features:**
- List all promotional coupons
- Generate coupon codes
- Set discount type (percentage, fixed, free shipping)
- Configure usage limits (total and per user)
- Set validity dates
- Category/Product restrictions
- Track redemptions
- Bulk generate coupons

**Files to Create:**
- `app/(dashboard)/admin/marketing/coupons/page.tsx` - List page
- `components/admin/marketing/coupon-list.tsx` - Table component
- `components/admin/marketing/coupon-form-dialog.tsx` - Create/Edit modal
- `components/admin/marketing/coupon-generator.tsx` - Bulk generation
- `app/actions/coupon-actions.ts` - Server actions

**Table Columns:**
- Code
- Name
- Type (Percentage/Fixed/Free Shipping)
- Discount Value
- Usage (Count / Limit)
- Valid Dates
- Status
- Actions

### 3. Banner Management (`/admin/marketing/banners`)

**Features:**
- Upload hero banners for homepage
- Set banner title, subtitle, CTA
- Link to products/categories/pages
- Set display order
- Schedule banner visibility
- Mobile/Desktop variants
- Active/Inactive toggle

**Files to Create:**
- `app/(dashboard)/admin/marketing/banners/page.tsx` - List page
- `components/admin/marketing/banner-list.tsx` - Grid/List view
- `components/admin/marketing/banner-form-dialog.tsx` - Create/Edit modal
- `app/actions/banner-actions.ts` - Server actions

**Note:** Requires adding Banner model to Prisma schema

## Database Schema (Already Exists)

### DiscountType Model ✅
```prisma
model DiscountType {
  id                  String   @id @default(cuid())
  code                String   @unique
  name                String
  description         String?
  discountPercent     Decimal?
  discountAmount      Decimal?
  requiresVerification Boolean
  requiresCode        Boolean
  minPurchaseAmount   Decimal?
  maxDiscountAmount   Decimal?
  applicableToSale    Boolean
  priority            Int
  isActive            Boolean
  validFrom           DateTime?
  validUntil          DateTime?
  usageCount          Int
  usageLimit          Int?
  createdAt           DateTime
  updatedAt           DateTime
  createdBy           String?
}
```

### Coupon Model ✅
```prisma
model Coupon {
  id                   String     @id @default(cuid())
  code                 String     @unique
  name                 String
  description          String?
  discountType         CouponType
  discountValue        Decimal
  minPurchaseAmount    Decimal?
  maxDiscountAmount    Decimal?
  applicableCategories String[]
  applicableProducts   String[]
  excludedCategories   String[]
  excludedProducts     String[]
  usageLimit           Int?
  usageCount           Int
  perUserLimit         Int?
  validFrom            DateTime
  validUntil           DateTime
  isActive             Boolean
  isPublic             Boolean
  stackable            Boolean
  createdAt            DateTime
  updatedAt            DateTime
  createdBy            String?
}
```

### Banner Model (TO ADD)
```prisma
model Banner {
  id          String   @id @default(cuid())
  title       String
  subtitle    String?
  description String?
  imageUrl    String
  mobileImageUrl String?
  linkUrl     String?
  linkText    String?
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)
  validFrom   DateTime?
  validUntil  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   String?
}
```

## UI Design Patterns

### Consistent with Existing Pages
- Same table layouts as Orders/Customers
- Smart pagination with ellipsis
- Filter and search functionality
- Modal dialogs for create/edit
- Toast notifications for actions
- Icons for visual clarity
- Status badges (Active/Inactive/Expired)

### Color Coding
- **Active**: Green badge
- **Inactive**: Gray badge
- **Expired**: Red badge
- **Scheduled**: Blue badge

## Implementation Priority

1. **Discount Types** (Highest Priority)
   - Most commonly used
   - Already integrated with orders
   - Simple CRUD operations

2. **Coupons**
   - Customer-facing feature
   - Drives sales and promotions
   - More complex with redemption tracking

3. **Banners** (Lowest Priority)
   - Requires schema addition
   - Needs image upload handling
   - Frontend display integration

## Next Steps

1. Create discount types list page and components
2. Build discount form with validation
3. Add coupon management system
4. Implement banner management
5. Update sidebar navigation
6. Add marketing dashboard/analytics

## Integration Points

- **Orders**: Apply discounts and coupons at checkout
- **Products**: Show promotional badges
- **Customers**: Track coupon usage per customer
- **Dashboard**: Show marketing performance metrics

## Testing Checklist

- [ ] Create discount type
- [ ] Edit discount type
- [ ] Delete discount type
- [ ] Toggle discount status
- [ ] Create coupon
- [ ] Generate bulk coupons
- [ ] Track coupon redemptions
- [ ] Apply discount to order
- [ ] Apply coupon to order
- [ ] Stack multiple discounts
- [ ] Validate date ranges
- [ ] Check usage limits
- [ ] Upload banner image
- [ ] Schedule banner visibility
