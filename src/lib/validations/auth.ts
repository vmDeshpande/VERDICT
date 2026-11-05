import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, {
      message: 'Password exceeds maximum length',
    }),
  name: z.string().trim().min(1, 'Name is required').optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email'),
  password: z
    .string()
    .min(1, 'Password is required')
    .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, {
      message: 'Invalid credentials',
    }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
