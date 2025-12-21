import { z } from 'zod';

// Login request
export const LoginSchema = z.object({
  password: z
    .string()
    .min(1, 'Password is required')
    .max(100, 'Password too long'),
});

// Auth status response
export const AuthStatusSchema = z.object({
  authenticated: z.boolean(),
  sessionId: z.string().optional(),
});

// Login response
export const LoginResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
