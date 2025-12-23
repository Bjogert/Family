import { z } from 'zod';

// User roles
export const UserRoleSchema = z.enum(['pappa', 'mamma', 'barn', 'bebis', 'annan']);

// Gender options
export const GenderSchema = z.enum(['pojke', 'flicka', 'annat']);

// User type
export const UserSchema = z.object({
  id: z.number(),
  username: z.string(),
  displayName: z.string().nullable(),
  role: UserRoleSchema.nullable().optional(),
  birthday: z.string().nullable().optional(), // ISO date string
  gender: GenderSchema.nullable().optional(),
  avatarEmoji: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  hasPassword: z.boolean().optional(),
  email: z.string().email().nullable().optional(),
  emailVerified: z.boolean().optional(),
});

// User creation/update schema
export const CreateUserSchema = z.object({
  username: z.string().min(2).max(50),
  password: z.string().min(4).optional(),
  displayName: z.string().min(1).max(100),
  role: UserRoleSchema.optional(),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD
  gender: GenderSchema.optional(),
  avatarEmoji: z.string().max(10).optional(),
  color: z.string().max(20).optional(),
  email: z.string().email().optional(),
  privacyConsent: z.boolean().optional(), // GDPR consent
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

// Password reset request
export const ForgotPasswordSchema = z.object({
  email: z.string().email('Ogiltig e-postadress'),
});

// Password reset with token
export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(4, 'Lösenordet måste vara minst 4 tecken'),
});

// Email verification request
export const VerifyEmailSchema = z.object({
  token: z.string().min(1),
});
