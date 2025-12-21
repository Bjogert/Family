import { z } from 'zod';
import {
  LoginSchema,
  AuthStatusSchema,
  LoginResponseSchema,
} from '../schemas/auth.js';

export type LoginRequest = z.infer<typeof LoginSchema>;
export type AuthStatus = z.infer<typeof AuthStatusSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
