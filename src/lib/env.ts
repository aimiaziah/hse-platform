// Environment Variable Validation
// Validates all environment variables on startup to prevent runtime errors
import { z } from 'zod';

/**
 * Check if we're running in browser context
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Environment variable schema
 * All required variables will cause startup failure if missing
 * Optional variables have sensible defaults
 *
 * Note: Server-side variables are only validated on the server
 */
const envSchema = z.object({
  // ═══════════════════════════════════════════════════════════
  // REQUIRED - Client-side variables (available in browser)
  // ═══════════════════════════════════════════════════════════
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),

  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),

  // ═══════════════════════════════════════════════════════════
  // REQUIRED - Server-side only (NOT available in browser)
  // ═══════════════════════════════════════════════════════════
  SUPABASE_SERVICE_ROLE_KEY: isBrowser
    ? z.string().optional()
    : z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  JWT_SECRET: isBrowser
    ? z.string().optional()
    : z.string().min(32, 'JWT_SECRET must be at least 32 characters for security'),

  // ═══════════════════════════════════════════════════════════
  // OPTIONAL - Environment & Logging
  // ═══════════════════════════════════════════════════════════
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  LOG_LEVEL: z
    .enum(['debug', 'info', 'warn', 'error'])
    .default('info'),

  // ═══════════════════════════════════════════════════════════
  // OPTIONAL - Authentication Configuration
  // ═══════════════════════════════════════════════════════════
  JWT_EXPIRES_IN: z.string().default('7d'),

  ENABLE_PIN_AUTH: z
    .string()
    .transform((val) => val !== 'false')
    .default('true'),

  ENABLE_MICROSOFT_AUTH: z
    .string()
    .transform((val) => val !== 'false')
    .default('true'),

  PREFER_MICROSOFT_AUTH: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),

  ALLOWED_EMAIL_DOMAINS: z.string().optional(),

  // ═══════════════════════════════════════════════════════════
  // OPTIONAL - Rate Limiting
  // ═══════════════════════════════════════════════════════════
  AUTH_RATE_LIMIT_MAX_REQUESTS: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('5'),

  AUTH_RATE_LIMIT_WINDOW_MS: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('900000'),

  // ═══════════════════════════════════════════════════════════
  // OPTIONAL - Redis
  // ═══════════════════════════════════════════════════════════
  REDIS_URL: z.string().url().optional().or(z.literal('')),

  // ═══════════════════════════════════════════════════════════
  // OPTIONAL - Microsoft OAuth
  // ═══════════════════════════════════════════════════════════
  NEXT_PUBLIC_SHAREPOINT_OAUTH_CLIENT_ID: z.string().optional(),
  NEXT_PUBLIC_SHAREPOINT_TENANT_ID: z.string().optional(),
  NEXT_PUBLIC_SHAREPOINT_SITE_URL: z.string().url().optional().or(z.literal('')),
  NEXT_PUBLIC_SHAREPOINT_LIBRARY_NAME: z.string().optional(),
  NEXT_PUBLIC_SHAREPOINT_BASE_FOLDER: z.string().optional(),

  // ═══════════════════════════════════════════════════════════
  // OPTIONAL - Google Drive
  // ═══════════════════════════════════════════════════════════
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_API_KEY: z.string().optional(),

  // ═══════════════════════════════════════════════════════════
  // OPTIONAL - Cloudflare R2 Storage
  // ═══════════════════════════════════════════════════════════
  NEXT_PUBLIC_R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  NEXT_PUBLIC_R2_BUCKET_NAME: z.string().optional(),
  NEXT_PUBLIC_R2_PUBLIC_DOMAIN: z.string().optional(),

  // ═══════════════════════════════════════════════════════════
  // OPTIONAL - DigitalOcean Spaces
  // ═══════════════════════════════════════════════════════════
  DO_SPACES_NAME: z.string().optional(),
  DO_SPACES_REGION: z.string().optional(),
  DO_SPACES_KEY: z.string().optional(),
  DO_SPACES_SECRET: z.string().optional(),
  DO_SPACES_ENDPOINT: z.string().url().optional().or(z.literal('')),

  // ═══════════════════════════════════════════════════════════
  // OPTIONAL - Power Automate
  // ═══════════════════════════════════════════════════════════
  NEXT_PUBLIC_POWER_AUTOMATE_WEBHOOK_URL: z.string().url().optional().or(z.literal('')),

  // ═══════════════════════════════════════════════════════════
  // OPTIONAL - AI Model Configuration
  // ═══════════════════════════════════════════════════════════
  AI_DEPLOYMENT_TYPE: z.enum(['roboflow', 'aws', 'gcp', 'azure']).optional(),
  ROBOFLOW_API_KEY: z.string().optional(),
  ROBOFLOW_MODEL_ENDPOINT: z.string().optional(),
  AWS_LAMBDA_ENDPOINT: z.string().url().optional().or(z.literal('')),

  // ═══════════════════════════════════════════════════════════
  // OPTIONAL - Application Config
  // ═══════════════════════════════════════════════════════════
  NEXT_PUBLIC_APP_NAME: z.string().default('PWA Inspection Platform'),
  NEXT_PUBLIC_APP_VERSION: z.string().default('1.0.0'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().or(z.literal('')),
});

/**
 * Validated environment variables
 */
let validatedEnv: z.infer<typeof envSchema> | null = null;

/**
 * Initialize and validate environment variables
 * This runs once at module load time
 */
function initializeEnv() {
  try {
    // In browser, use a more lenient approach since Next.js inlines these at build time
    const envToValidate = typeof window !== 'undefined'
      ? {
          // Client-side: explicitly pull from process.env (which Next.js should have inlined)
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          // Add other NEXT_PUBLIC_ vars that the client needs
          NEXT_PUBLIC_SHAREPOINT_OAUTH_CLIENT_ID: process.env.NEXT_PUBLIC_SHAREPOINT_OAUTH_CLIENT_ID,
          NEXT_PUBLIC_SHAREPOINT_TENANT_ID: process.env.NEXT_PUBLIC_SHAREPOINT_TENANT_ID,
          NEXT_PUBLIC_SHAREPOINT_SITE_URL: process.env.NEXT_PUBLIC_SHAREPOINT_SITE_URL,
          NEXT_PUBLIC_SHAREPOINT_LIBRARY_NAME: process.env.NEXT_PUBLIC_SHAREPOINT_LIBRARY_NAME,
          NEXT_PUBLIC_SHAREPOINT_BASE_FOLDER: process.env.NEXT_PUBLIC_SHAREPOINT_BASE_FOLDER,
          NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          NEXT_PUBLIC_GOOGLE_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
          NEXT_PUBLIC_R2_ACCOUNT_ID: process.env.NEXT_PUBLIC_R2_ACCOUNT_ID,
          NEXT_PUBLIC_R2_BUCKET_NAME: process.env.NEXT_PUBLIC_R2_BUCKET_NAME,
          NEXT_PUBLIC_R2_PUBLIC_DOMAIN: process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN,
          NEXT_PUBLIC_POWER_AUTOMATE_WEBHOOK_URL: process.env.NEXT_PUBLIC_POWER_AUTOMATE_WEBHOOK_URL,
          NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
          NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
          NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
          NODE_ENV: process.env.NODE_ENV,
          LOG_LEVEL: process.env.LOG_LEVEL,
        }
      : process.env; // Server-side: use full process.env

    validatedEnv = envSchema.parse(envToValidate);

    // Only log in non-production to avoid leaking info
    if (process.env.NODE_ENV !== 'production') {
      const context = typeof window !== 'undefined' ? 'Browser' : 'Server';
      console.log(`✅ [${context}] Environment variables validated successfully`);
    }

    return validatedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const context = typeof window !== 'undefined' ? 'Browser' : 'Server';
      console.error(`\n❌ [${context}] Environment Variable Validation Failed!\n`);
      console.error('The following environment variables have issues:\n');

      error.errors.forEach((err) => {
        const field = err.path.join('.');
        console.error(`  ❌ ${field}: ${err.message}`);
      });

      console.error('\n📝 Please check your .env file and ensure all required variables are set.');
      console.error('📄 See .env.example for reference.\n');

      // In browser, show more helpful message
      if (typeof window !== 'undefined') {
        console.error('🔄 Browser-side env validation failed. Try:');
        console.error('1. Stop the dev server (Ctrl+C)');
        console.error('2. Delete .next folder: rm -rf .next');
        console.error('3. Restart: npm run dev');
        console.error('4. Hard refresh browser (Ctrl+Shift+R)\n');
      } else if (process.env.NODE_ENV !== 'test') {
        // Exit in server-side only (not during build or test)
        process.exit(1);
      }
    }
    throw error;
  }
}

// Initialize environment variables
const env = initializeEnv();

/**
 * Type-safe environment variable access
 * Use this instead of process.env directly
 */
export { env };

/**
 * Get a specific environment variable
 */
export function getEnv<K extends keyof typeof env>(key: K): typeof env[K] {
  if (!env) {
    throw new Error('Environment variables not initialized');
  }
  return env[key];
}

/**
 * Check if an optional environment variable is set
 */
export function hasEnv(key: keyof typeof env): boolean {
  if (!env) return false;
  const value = env[key];
  return value !== undefined && value !== null && value !== '';
}

/**
 * Get boolean environment variable
 */
export function getBooleanEnv(key: keyof typeof env): boolean {
  if (!env) return false;
  const value = env[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return false;
}

/**
 * Get number environment variable
 */
export function getNumberEnv(key: keyof typeof env): number {
  if (!env) return 0;
  const value = env[key];
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseInt(value, 10) || 0;
  return 0;
}

/**
 * Validate that required storage configuration exists
 */
export function hasStorageConfig(provider: 'r2' | 'digitalocean'): boolean {
  if (!env) return false;

  switch (provider) {
    case 'r2':
      return !!(
        env.NEXT_PUBLIC_R2_ACCOUNT_ID &&
        env.R2_ACCESS_KEY_ID &&
        env.R2_SECRET_ACCESS_KEY &&
        env.NEXT_PUBLIC_R2_BUCKET_NAME
      );
    case 'digitalocean':
      return !!(
        env.DO_SPACES_NAME &&
        env.DO_SPACES_REGION &&
        env.DO_SPACES_KEY &&
        env.DO_SPACES_SECRET
      );
    default:
      return false;
  }
}

/**
 * Validate that OAuth configuration exists
 */
export function hasOAuthConfig(provider: 'microsoft' | 'google'): boolean {
  if (!env) return false;

  switch (provider) {
    case 'microsoft':
      return !!(
        env.NEXT_PUBLIC_SHAREPOINT_OAUTH_CLIENT_ID &&
        env.NEXT_PUBLIC_SHAREPOINT_TENANT_ID
      );
    case 'google':
      return !!(
        env.NEXT_PUBLIC_GOOGLE_CLIENT_ID &&
        env.NEXT_PUBLIC_GOOGLE_API_KEY
      );
    default:
      return false;
  }
}

export default env;
