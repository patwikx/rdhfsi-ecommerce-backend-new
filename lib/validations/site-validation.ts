import { z } from 'zod';

export const siteFormSchema = z.object({
  code: z.string().min(1, 'Site code is required').max(10, 'Code must be 10 characters or less'),
  name: z.string().min(1, 'Site name is required').max(100, 'Name must be 100 characters or less'),
  type: z.enum(['STORE', 'WAREHOUSE', 'MARKDOWN']),
  isMarkdown: z.boolean(),
  isActive: z.boolean(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
});

export type SiteFormValues = z.infer<typeof siteFormSchema>;
