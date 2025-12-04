// src/lib/api-client.ts - Authenticated API Client
import { storage } from '@/utils/storage';

/**
 * Wrapper around fetch that includes authentication credentials
 * This ensures cookies are sent with all API requests
 */
export async function apiClient(url: string, options: RequestInit = {}): Promise<Response> {
  // Get token from localStorage as fallback
  const token = storage.load('authToken', null);

  const defaultOptions: RequestInit = {
    credentials: 'include', // Always include cookies for authentication
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}), // Add token as fallback
      ...options.headers,
    },
  };

  return fetch(url, {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  });
}

/**
 * Helper for GET requests
 */
export async function apiGet<T = any>(url: string): Promise<T> {
  const response = await apiClient(url, { method: 'GET' });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Helper for POST requests
 */
export async function apiPost<T = any>(url: string, data?: any): Promise<T> {
  const response = await apiClient(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Helper for PUT requests
 */
export async function apiPut<T = any>(url: string, data?: any): Promise<T> {
  const response = await apiClient(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Helper for DELETE requests
 */
export async function apiDelete<T = any>(url: string): Promise<T> {
  const response = await apiClient(url, { method: 'DELETE' });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}
