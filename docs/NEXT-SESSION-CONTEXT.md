# Continue: Sites & Categories CRUD Implementation

## ✅ Completed So Far:

### Validation Schemas Created:
- `lib/validations/site-validation.ts` ✅
- `lib/validations/category-validation.ts` ✅

### Server Actions Created:
- `app/actions/site-actions.ts` ✅ (Complete with all CRUD operations)

## 🔄 Next Steps to Complete:

### 1. Category Server Actions
Create: `app/actions/category-actions.ts`
- getAllCategories()
- getCategoryById()
- createCategory()
- updateCategory()
- deleteCategory()
- toggleCategoryStatus()
- getCategoryTree() // For parent/child hierarchy

### 2. Sites Pages
- `app/admin/sites/page.tsx` - List view with table
- `app/admin/sites/create/page.tsx` - Create form
- `app/admin/sites/[id]/edit/page.tsx` - Edit form

### 3. Categories Pages
- `app/admin/categories/page.tsx` - List view with tree
- `app/admin/categories/create/page.tsx` - Create form
- `app/admin/categories/[id]/edit/page.tsx` - Edit form

### 4. Reusable Components
- `components/admin/sites/site-list.tsx` - Data table
- `components/admin/sites/site-form.tsx` - Form component
- `components/admin/categories/category-list.tsx` - Tree view
- `components/admin/categories/category-form.tsx` - Form with parent selector
- `components/admin/categories/category-tree.tsx` - Hierarchical display

## 📋 Technical Details:

### File Upload Integration:
- Using MinIO S3 storage
- Component: `components/file-upload.tsx`
- API endpoint: `/api/upload`
- Returns: `{ fileName, fileUrl, originalName }`

### Patterns to Follow:
- ✅ No `any` types - strict TypeScript
- ✅ Server actions for all mutations
- ✅ Zod validation schemas
- ✅ Site-aware queries (use `useCurrentSite()` hook)
- ✅ Theme-aware components
- ✅ shadcn/ui components (Table, Form, Button, etc.)

### User Permissions:
- **ADMIN**: Full CRUD access
- **MANAGER/STAFF**: Read-only for sites, full access for categories
- **CUSTOMER/CORPORATE**: No access to admin

## 🎯 Implementation Order:

1. **Category Actions** (next immediate task)
2. **Sites List Page** (with data table)
3. **Sites Create/Edit Forms**
4. **Categories List Page** (with tree view)
5. **Categories Create/Edit Forms**

## 📊 Data Models Reference:

### Site Model:
```prisma
model Site {
  id         String   @id @default(cuid())
  code       String   @unique
  name       String
  type       SiteType // STORE, WAREHOUSE, MARKDOWN
  isMarkdown Boolean  @default(false)
  isActive   Boolean  @default(true)
  address    String?
  phone      String?
  email      String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

### Category Model:
```prisma
model Category {
  id          String     @id @default(cuid())
  name        String     @unique
  slug        String     @unique
  description String?
  image       String?
  parentId    String?
  parent      Category?  @relation("CategoryToCategory", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryToCategory")
  itemCount   Int        @default(0)
  trendPercent Decimal?  @db.Decimal(5, 2)
  isActive    Boolean   @default(true)
  isFeatured  Boolean   @default(false)
  sortOrder   Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

## 🚀 Ready to Continue!

Start with creating `app/actions/category-actions.ts` following the same pattern as site-actions.
