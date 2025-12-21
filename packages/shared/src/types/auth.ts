import { z } from 'zod';
import {
  UserSchema,
  LoginSchema,
  AuthStatusSchema,
  LoginResponseSchema,
} from '../schemas/auth.js';

export type User = z.infer<typeof UserSchema>;
export type LoginRequest = z.infer<typeof LoginSchema>;
export type AuthStatus = z.infer<typeof AuthStatusSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
