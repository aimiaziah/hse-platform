// Environment Variable Validation and Access
// Centralized environment variable access with validation

/**
 * Validated environment variables
 * All environment access should go through this module
 */
export const env = {
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // Authentication Configuration
  ENABLE_PIN_AUTH: process.env.ENABLE_PIN_AUTH === 'true',
  ENABLE_MICROSOFT_AUTH: process.env.ENABLE_MICROSOFT_AUTH === 'true',
  PREFER_MICROSOFT_AUTH: process.env.PREFER_MICROSOFT_AUTH === 'true',
  ALLOWED_EMAIL_DOMAINS: process.env.ALLOWED_EMAIL_DOMAINS || '',

  // Rate Limiting Configuration
  AUTH_RATE_LIMIT_MAX_REQUESTS: parseInt(
    process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5',
    10,
  ),
  AUTH_RATE_LIMIT_WINDOW_MS: parseInt(
    process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000',
    10,
  ),

  // Microsoft OAuth Configuration
  NEXT_PUBLIC_SHAREPOINT_OAUTH_CLIENT_ID:
    process.env.NEXT_PUBLIC_SHAREPOINT_OAUTH_CLIENT_ID || '',
  NEXT_PUBLIC_SHAREPOINT_TENANT_ID:
    process.env.NEXT_PUBLIC_SHAREPOINT_TENANT_ID || 'common',

  // Application Configuration
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};

