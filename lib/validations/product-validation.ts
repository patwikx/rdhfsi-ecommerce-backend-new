import { z } from 'zod';

export const productFormSchema = z.object({
  // Basic Info
  sku: z.string().min(1, 'SKU is required').max(50),
  barcode: z.string().min(1, 'Barcode is required').max(50),
  name: z.string().min(1, 'Product name is required').max(255),
  slug: z.string().min(1, 'Slug is required').max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens only'),
  description: z.string().optional(),
  shortDescription: z.string().max(500).optional(),
  
  // Categorization
  categoryId: z.string().min(1, 'Category is required'),
  brandId: z.string().nullable().optional(),
  model: z.string().max(100).optional(),
  
  // Pricing
  baseUom: z.string().min(1, 'Base UOM is required').max(20),
  retailPrice: z.number().min(0, 'Retail price must be positive'),
  wholesalePrice: z.number().min(0).optional().nullable(),
  poPrice: z.number().min(0).optional().nullable(),
  costPrice: z.number().min(0).optional().nullable(),
  compareAtPrice: z.number().min(0).optional().nullable(),
  
  // Bulk Pricing
  moq: z.number().int().min(1),
  bulkPrice: z.number().min(0).optional().nullable(),
  bulkThreshold: z.number().int().min(1).optional().nullable(),
  
  // Physical
  weight: z.number().min(0).optional().nullable(),
  dimensions: z.string().max(50).optional(),
  leadTime: z.string().max(50).optional(),
  
  // Status
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  isPublished: z.boolean(),
  isTrending: z.boolean(),
  isOnSale: z.boolean(),
  isClearance: z.boolean(),
  
  // SEO
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().max(500).optional(),
  metaKeywords: z.string().max(500).optional(),
  
  // Specifications (JSON)
  specifications: z.string().optional(), // Will be parsed as JSON
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
