// In production, use the same host as the page. In dev, Vite proxies /api to localhost:3001
function getApiBase(): string {
  if (typeof window === 'undefined') return '/api'; // SSR
  // Use the same host/port as the page, but port 3001 for API
  const host = window.location.hostname;
  const isLocalhost = host === 'localhost' || host === '127.0.0.1';
  if (isLocalhost) return '/api'; // Dev mode uses Vite proxy
  return `http://${host}:3001/api`; // Production: same host, port 3001
}

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
  const apiBase = getApiBase();
  const response = await fetch(`${apiBase}${endpoint}`, {
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
