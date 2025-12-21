import { z } from 'zod';

// User type
export const UserSchema = z.object({
  id: z.number(),
  username: z.string(),
  displayName: z.string().nullable(),
});

// Login request
export const LoginSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .max(50, 'Username too long'),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(100, 'Password too long'),
});

// Auth status response
export const AuthStatusSchema = z.object({
  authenticated: z.boolean(),
  user: UserSchema.nullable().optional(),
});

// Login response
export const LoginResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  user: UserSchema.optional(),
});
