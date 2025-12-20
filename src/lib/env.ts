// Environment Variables Configuration
// This file provides type-safe access to environment variables

export const env = {
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,

  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Application Configuration
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'PWA Inspection Platform',
  NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Analytics & Monitoring
  NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  NEXT_PUBLIC_DEBUG: process.env.NEXT_PUBLIC_DEBUG === 'true',

  // Google Drive Integration
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  NEXT_PUBLIC_GOOGLE_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
  NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID: process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID,

  // AI Detection Configuration
  AI_DEPLOYMENT_TYPE: process.env.AI_DEPLOYMENT_TYPE || 'gcp',
  GCP_CLOUD_RUN_ENDPOINT: process.env.GCP_CLOUD_RUN_ENDPOINT || 'http://127.0.0.1:8000',
  AI_MIN_CONFIDENCE: parseFloat(process.env.AI_MIN_CONFIDENCE || '0.3'),
  AI_TIMEOUT_MS: parseInt(process.env.AI_TIMEOUT_MS || '30000', 10),
  AI_DEBUG_LOGGING: process.env.AI_DEBUG_LOGGING === 'true',
  AI_USE_MOCK: process.env.AI_USE_MOCK === 'true',

  // SharePoint OAuth Configuration
  NEXT_PUBLIC_SHAREPOINT_OAUTH_CLIENT_ID: process.env.NEXT_PUBLIC_SHAREPOINT_OAUTH_CLIENT_ID,
  NEXT_PUBLIC_SHAREPOINT_TENANT_ID: process.env.NEXT_PUBLIC_SHAREPOINT_TENANT_ID,
  NEXT_PUBLIC_SHAREPOINT_SITE_URL: process.env.NEXT_PUBLIC_SHAREPOINT_SITE_URL,
  NEXT_PUBLIC_SHAREPOINT_LIBRARY_NAME: process.env.NEXT_PUBLIC_SHAREPOINT_LIBRARY_NAME,
  NEXT_PUBLIC_SHAREPOINT_BASE_FOLDER: process.env.NEXT_PUBLIC_SHAREPOINT_BASE_FOLDER,

  // Authentication Configuration
  ENABLE_PIN_AUTH: process.env.ENABLE_PIN_AUTH !== 'false',
  ENABLE_MICROSOFT_AUTH: process.env.ENABLE_MICROSOFT_AUTH === 'true',
  PREFER_MICROSOFT_AUTH: process.env.PREFER_MICROSOFT_AUTH === 'true',
  ALLOWED_EMAIL_DOMAINS: process.env.ALLOWED_EMAIL_DOMAINS || '',
  AUTH_RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5', 10),
  AUTH_RATE_LIMIT_WINDOW_MS: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10),

  // Email Whitelists for Role Assignment
  ADMIN_EMAIL_WHITELIST: process.env.ADMIN_EMAIL_WHITELIST || '',
  SUPERVISOR_EMAIL_WHITELIST: process.env.SUPERVISOR_EMAIL_WHITELIST || '',
  INSPECTOR_EMAIL_WHITELIST: process.env.INSPECTOR_EMAIL_WHITELIST || '',

  // DigitalOcean Spaces
  DO_SPACES_NAME: process.env.DO_SPACES_NAME,
  DO_SPACES_REGION: process.env.DO_SPACES_REGION,
  DO_SPACES_KEY: process.env.DO_SPACES_KEY,
  DO_SPACES_SECRET: process.env.DO_SPACES_SECRET,
} as const;
