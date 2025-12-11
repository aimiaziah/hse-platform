// Authentication Configuration
import { env } from './env';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

/**
 * Get rate limit configuration from environment
 */
export function getRateLimitConfig(): RateLimitConfig {
  return {
    maxRequests: env.AUTH_RATE_LIMIT_MAX_REQUESTS,
    windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  };
}

/**
 * Check if an authentication method is enabled
 */
export function isAuthMethodEnabled(method: 'pin' | 'microsoft'): boolean {
  if (method === 'pin') {
    return env.ENABLE_PIN_AUTH;
  }
  if (method === 'microsoft') {
    return env.ENABLE_MICROSOFT_AUTH;
  }
  return false;
}
