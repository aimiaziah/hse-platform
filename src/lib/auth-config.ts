// Authentication Configuration and Helpers
import { env } from './env';
import { validateEmailDomain } from './validation';

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
 * Get rate limit configuration
 */
export function getRateLimitConfig() {
  return {
    maxRequests: env.AUTH_RATE_LIMIT_MAX_REQUESTS,
    windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  };
}

/**
 * Get allowed email domains as an array
 */
function getAllowedEmailDomains(): string[] {
  if (!env.ALLOWED_EMAIL_DOMAINS) {
    return [];
  }
  return env.ALLOWED_EMAIL_DOMAINS.split(',').map((domain) => domain.trim()).filter(Boolean);
}

/**
 * Check if email domain is allowed
 */
export function isEmailDomainAllowed(email: string): boolean {
  const allowedDomains = getAllowedEmailDomains();
  return validateEmailDomain(email, allowedDomains);
}

/**
 * Check if email belongs to admin (based on domain or specific email)
 * You can customize this logic based on your requirements
 */
export function isAdminEmail(email: string): boolean {
  if (!email) return false;
  
  // Check if email domain is allowed (if domain whitelist is configured)
  const allowedDomains = getAllowedEmailDomains();
  if (allowedDomains.length > 0 && !isEmailDomainAllowed(email)) {
    return false;
  }

  // Add specific admin email checks here if needed
  // Example: return email.toLowerCase().includes('admin@') || email.toLowerCase().includes('manager@');
  
  return false; // Default: no specific admin emails
}

/**
 * Check if email belongs to supervisor
 */
export function isSupervisorEmail(email: string): boolean {
  if (!email) return false;
  
  const allowedDomains = getAllowedEmailDomains();
  if (allowedDomains.length > 0 && !isEmailDomainAllowed(email)) {
    return false;
  }

  // Add specific supervisor email checks here if needed
  // Example: return email.toLowerCase().includes('supervisor@');
  
  return false; // Default: no specific supervisor emails
}

/**
 * Check if email belongs to inspector
 */
export function isInspectorEmail(email: string): boolean {
  if (!email) return false;
  
  const allowedDomains = getAllowedEmailDomains();
  if (allowedDomains.length > 0 && !isEmailDomainAllowed(email)) {
    return false;
  }

  // Add specific inspector email checks here if needed
  // Example: return email.toLowerCase().includes('inspector@');
  
  return false; // Default: no specific inspector emails
}

