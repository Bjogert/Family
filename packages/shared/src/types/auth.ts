import { z } from 'zod';
import {
  UserSchema,
  UserRoleSchema,
  GenderSchema,
  CreateUserSchema,
  LoginSchema,
  AuthStatusSchema,
  LoginResponseSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
} from '../schemas/auth.js';

export type User = z.infer<typeof UserSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type Gender = z.infer<typeof GenderSchema>;
export type CreateUserRequest = z.infer<typeof CreateUserSchema>;
export type LoginRequest = z.infer<typeof LoginSchema>;
export type AuthStatus = z.infer<typeof AuthStatusSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordRequest = z.infer<typeof ResetPasswordSchema>;
export type VerifyEmailRequest = z.infer<typeof VerifyEmailSchema>;
