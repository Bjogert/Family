import { writable } from 'svelte/store';
import { get, post } from '$lib/api/client';

interface User {
  id: number;
  username: string;
  displayName: string | null;
}

interface Family {
  id: number;
  name: string;
}

interface AuthStatus {
  authenticated: boolean;
  family?: Family | null;
  user?: User | null;
}

interface LoginResponse {
  success: boolean;
  message?: string;
  family?: Family;
  user?: User;
}

export const authenticated = writable<boolean>(false);
export const currentFamily = writable<Family | null>(null);
export const currentUser = writable<User | null>(null);
export const loading = writable<boolean>(true);
export const error = writable<string | null>(null);

export async function checkAuth(): Promise<boolean> {
  loading.set(true);
  error.set(null);

  try {
    const status = await get<AuthStatus>('/auth/status');
    authenticated.set(status.authenticated);
    currentFamily.set(status.family || null);
    currentUser.set(status.user || null);
    return status.authenticated;
  } catch (err) {
    authenticated.set(false);
    currentFamily.set(null);
    currentUser.set(null);
    return false;
  } finally {
    loading.set(false);
  }
}

export async function login(familyId: number, username: string, password: string): Promise<boolean> {
  loading.set(true);
  error.set(null);

  try {
    const result = await post<LoginResponse>('/auth/login', { familyId, username, password });
    if (result.success) {
      authenticated.set(true);
      currentFamily.set(result.family || null);
      currentUser.set(result.user || null);
      return true;
    } else {
      error.set(result.message || 'Login failed');
      return false;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Login failed';
    error.set(message);
    return false;
  } finally {
    loading.set(false);
  }
}

export async function logout(): Promise<void> {
  loading.set(true);

  try {
    await post('/auth/logout');
  } catch {
    // Ignore errors on logout
  } finally {
    authenticated.set(false);
    currentFamily.set(null); currentUser.set(null);
    loading.set(false);
  }
}