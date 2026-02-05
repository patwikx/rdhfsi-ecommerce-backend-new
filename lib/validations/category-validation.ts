import { z } from 'zod';

export const categoryFormSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100, 'Name must be 100 characters or less'),
  slug: z.string().min(1, 'Slug is required').max(100, 'Slug must be 100 characters or less')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens only'),
  description: z.string().optional(),
  image: z.string().optional(),
  parentId: z.string().optional().nullable(),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  sortOrder: z.number().int().min(0),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
