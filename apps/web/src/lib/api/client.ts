const API_BASE = '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const error = await response.json();
      message = error.message || error.error || message;
    } catch {
      // Ignore JSON parse errors
    }
    throw new ApiError(message, response.status);
  }

  return response.json();
}

export function get<T>(endpoint: string): Promise<T> {
  return apiCall<T>(endpoint, { method: 'GET' });
}

export function post<T>(endpoint: string, body?: unknown): Promise<T> {
  return apiCall<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function patch<T>(endpoint: string, body?: unknown): Promise<T> {
  return apiCall<T>(endpoint, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function del<T>(endpoint: string): Promise<T> {
  return apiCall<T>(endpoint, { method: 'DELETE' });
}
