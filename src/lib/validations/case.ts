import { z } from 'zod';

export const createCaseSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(160),
  description: z.string().trim().min(1, 'Description is required').max(5000),
  jurisdiction: z.enum(['India', 'United States']),
  caseType: z.enum(['Criminal', 'Civil']),
  courtType: z.string().trim().max(120).optional().or(z.literal('')),
  isFictional: z.boolean().optional().default(false),
});

export type CreateCaseInput = z.infer<typeof createCaseSchema>;
