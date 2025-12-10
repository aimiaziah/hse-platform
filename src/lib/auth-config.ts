// Authentication Configuration
// Centralized configuration for authentication methods, rate limiting, and role mapping

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

/**
 * Get rate limit configuration from environment variables
 */
export function getRateLimitConfig(): RateLimitConfig {
  const maxRequests = parseInt(
    process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5',
    10,
  );
  const windowMs = parseInt(
    process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', // 15 minutes default
    10,
  );

  return {
    maxRequests,
    windowMs,
  };
}

/**
 * Check if an authentication method is enabled
 */
export function isAuthMethodEnabled(method: 'pin' | 'microsoft'): boolean {
  if (method === 'pin') {
    return process.env.ENABLE_PIN_AUTH === 'true';
  }
  if (method === 'microsoft') {
    return process.env.ENABLE_MICROSOFT_AUTH === 'true';
  }
  return false;
}

/**
 * Get allowed email domains from environment
 */
function getAllowedEmailDomains(): string[] {
  const domains = process.env.ALLOWED_EMAIL_DOMAINS || '';
  return domains
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d.length > 0);
}

/**
 * Check if email is in admin whitelist
 * You can customize this by setting ADMIN_EMAILS environment variable
 * Format: comma-separated list of emails or email patterns
 */
export function isAdminEmail(email: string): boolean {
  if (!email) return false;

  const emailLower = email.toLowerCase();
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim().toLowerCase()) || [];

  // Check exact email match
  if (adminEmails.includes(emailLower)) {
    return true;
  }

  // Check email pattern (e.g., *@admin.theta-edge.com)
  return adminEmails.some((pattern) => {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(emailLower);
    }
    return false;
  });
}

/**
 * Check if email is in supervisor whitelist
 * You can customize this by setting SUPERVISOR_EMAILS environment variable
 */
export function isSupervisorEmail(email: string): boolean {
  if (!email) return false;

  const emailLower = email.toLowerCase();
  const supervisorEmails =
    process.env.SUPERVISOR_EMAILS?.split(',').map((e) => e.trim().toLowerCase()) || [];

  // Check exact email match
  if (supervisorEmails.includes(emailLower)) {
    return true;
  }

  // Check email pattern
  return supervisorEmails.some((pattern) => {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(emailLower);
    }
    return false;
  });
}

/**
 * Check if email is in inspector whitelist
 * You can customize this by setting INSPECTOR_EMAILS environment variable
 */
export function isInspectorEmail(email: string): boolean {
  if (!email) return false;

  const emailLower = email.toLowerCase();
  const inspectorEmails =
    process.env.INSPECTOR_EMAILS?.split(',').map((e) => e.trim().toLowerCase()) || [];

  // Check exact email match
  if (inspectorEmails.includes(emailLower)) {
    return true;
  }

  // Check email pattern
  return inspectorEmails.some((pattern) => {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(emailLower);
    }
    return false;
  });
}

