import { z } from 'zod';

export const brandFormSchema = z.object({
  name: z.string().min(1, 'Brand name is required').max(100, 'Name must be 100 characters or less'),
  slug: z.string().min(1, 'Slug is required').max(100, 'Slug must be 100 characters or less')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens only'),
  logo: z.string().optional(),
  description: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  isFeatured: z.boolean(),
  sortOrder: z.number().int().min(0),
  isActive: z.boolean(),
});

export type BrandFormValues = z.infer<typeof brandFormSchema>;
