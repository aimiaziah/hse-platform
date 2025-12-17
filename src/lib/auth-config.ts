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

/**
 * Email whitelist helper functions for role mapping
 * These can be configured via environment variables if needed
 */

/**
 * Check if an email is in the admin whitelist
 */
export function isAdminEmail(email: string): boolean {
  const adminEmails = process.env.ADMIN_EMAIL_WHITELIST?.split(',').map(e => e.trim().toLowerCase()) || [];
  return adminEmails.includes(email.toLowerCase());
}

/**
 * Check if an email is in the supervisor whitelist
 */
export function isSupervisorEmail(email: string): boolean {
  const supervisorEmails = process.env.SUPERVISOR_EMAIL_WHITELIST?.split(',').map(e => e.trim().toLowerCase()) || [];
  return supervisorEmails.includes(email.toLowerCase());
}

/**
 * Check if an email is in the inspector whitelist
 */
export function isInspectorEmail(email: string): boolean {
  const inspectorEmails = process.env.INSPECTOR_EMAIL_WHITELIST?.split(',').map(e => e.trim().toLowerCase()) || [];
  return inspectorEmails.includes(email.toLowerCase());
}
