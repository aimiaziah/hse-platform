// Authentication Configuration and Utilities

/**
 * Get allowed email domains from environment
 */
export function getAllowedEmailDomains(): string[] {
  const domains = process.env.ALLOWED_EMAIL_DOMAINS || '';
  return domains
    .split(',')
    .map(d => d.trim().toLowerCase())
    .filter(d => d.length > 0);
}

/**
 * Check if email domain is allowed
 */
export function isEmailDomainAllowed(email: string): boolean {
  const allowedDomains = getAllowedEmailDomains();

  // If no domains configured, allow all (backward compatibility)
  if (allowedDomains.length === 0) {
    return true;
  }

  const emailDomain = email.toLowerCase().split('@')[1];
  if (!emailDomain) {
    return false;
  }

  return allowedDomains.includes(emailDomain);
}

/**
 * Get authentication feature flags
 */
export function getAuthConfig() {
  return {
    enablePinAuth: process.env.ENABLE_PIN_AUTH !== 'false',
    enableMicrosoftAuth: process.env.ENABLE_MICROSOFT_AUTH !== 'false',
    preferMicrosoftAuth: process.env.PREFER_MICROSOFT_AUTH === 'true',
    allowedDomains: getAllowedEmailDomains(),
  };
}

/**
 * Check if authentication method is enabled
 */
export function isAuthMethodEnabled(method: 'pin' | 'microsoft'): boolean {
  const config = getAuthConfig();
  return method === 'pin' ? config.enablePinAuth : config.enableMicrosoftAuth;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get rate limiting configuration
 */
export function getRateLimitConfig() {
  return {
    maxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5'),
    windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  };
}
