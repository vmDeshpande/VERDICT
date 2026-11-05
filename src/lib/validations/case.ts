import { z } from 'zod';

export const createCaseSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().optional().or(z.literal('')),
  jurisdiction: z.enum(['India', 'United States']),
  caseType: z.enum(['Criminal', 'Civil']),
  courtType: z.string().trim().optional().or(z.literal('')),
  isFictional: z.boolean().optional().default(false),
});

export type CreateCaseInput = z.infer<typeof createCaseSchema>;
