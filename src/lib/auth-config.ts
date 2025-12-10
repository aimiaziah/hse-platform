// Authentication Configuration and Utilities

/**
 * Get allowed email domains from environment
 */
export function getAllowedEmailDomains(): string[] {
  const domains = process.env.ALLOWED_EMAIL_DOMAINS || '';
  return domains
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d.length > 0);
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

/**
 * Get inspector email whitelist from environment
 */
export function getInspectorEmailWhitelist(): string[] {
  const emails = process.env.INSPECTOR_EMAIL_WHITELIST || '';
  return emails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

/**
 * Check if email is in inspector whitelist
 */
export function isInspectorEmail(email: string): boolean {
  const whitelist = getInspectorEmailWhitelist();

  // If no whitelist configured, return false (no auto-inspector assignment)
  if (whitelist.length === 0) {
    return false;
  }

  return whitelist.includes(email.toLowerCase());
}

/**
 * Get admin email whitelist from environment
 */
export function getAdminEmailWhitelist(): string[] {
  const emails = process.env.ADMIN_EMAIL_WHITELIST || '';
  return emails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

/**
 * Check if email is in admin whitelist
 */
export function isAdminEmail(email: string): boolean {
  const whitelist = getAdminEmailWhitelist();

  // If no whitelist configured, return false (no auto-admin assignment)
  if (whitelist.length === 0) {
    return false;
  }

  return whitelist.includes(email.toLowerCase());
}

/**
 * Get supervisor email whitelist from environment
 */
export function getSupervisorEmailWhitelist(): string[] {
  const emails = process.env.SUPERVISOR_EMAIL_WHITELIST || '';
  return emails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

/**
 * Check if email is in supervisor whitelist
 */
export function isSupervisorEmail(email: string): boolean {
  const whitelist = getSupervisorEmailWhitelist();

  // If no whitelist configured, return false (no auto-supervisor assignment)
  if (whitelist.length === 0) {
    return false;
  }

  return whitelist.includes(email.toLowerCase());
}
