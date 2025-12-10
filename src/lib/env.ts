// Environment Variable Validation
// Validates all environment variables on startup using Zod
import { z } from 'zod';
import { logger } from './logger';

/**
 * Environment variable schema
 * Validates all required environment variables on startup
 */
const envSchema = z.object({
  // ═══════════════════════════════════════════════════
  // REQUIRED - Application will not start without these
  // ═══════════════════════════════════════════════════
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service key required'),
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),

  // ═══════════════════════════════════════════════════
  // OPTIONAL - With sensible defaults
  // ═══════════════════════════════════════════════════
  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Authentication
  JWT_EXPIRES_IN: z.string().default('7d'),
  ENABLE_PIN_AUTH: z.string().default('true'),
  ENABLE_MICROSOFT_AUTH: z.string().default('true'),
  PREFER_MICROSOFT_AUTH: z.string().default('true'),
  ALLOWED_EMAIL_DOMAINS: z.string().optional(),

  // Rate Limiting
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.string().default('5'),
  AUTH_RATE_LIMIT_WINDOW_MS: z.string().default('900000'),

  // Redis (optional)
  REDIS_URL: z.string().url().optional(),

  // Microsoft OAuth (optional)
  NEXT_PUBLIC_SHAREPOINT_OAUTH_CLIENT_ID: z.string().optional(),
  NEXT_PUBLIC_SHAREPOINT_TENANT_ID: z.string().optional(),

  // Storage (optional)
  NEXT_PUBLIC_R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  NEXT_PUBLIC_R2_BUCKET_NAME: z.string().optional(),
  NEXT_PUBLIC_R2_PUBLIC_DOMAIN: z.string().optional(),

  DO_SPACES_NAME: z.string().optional(),
  DO_SPACES_REGION: z.string().optional(),
  DO_SPACES_KEY: z.string().optional(),
  DO_SPACES_SECRET: z.string().optional(),
  DO_SPACES_ENDPOINT: z.string().optional(),
});

/**
 * Validated environment variables
 * Use this instead of process.env directly
 */
let validatedEnv: z.infer<typeof envSchema>;

try {
  validatedEnv = envSchema.parse(process.env);
  logger.info('Environment variables validated successfully');
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment variable validation failed:');
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
  throw error;
}

export const env = validatedEnv;

/**
 * Type-safe environment variable access
 */
export function getEnv<K extends keyof typeof env>(key: K): typeof env[K] {
  return env[key];
}

/**
 * Check if environment variable is set (for optional vars)
 */
export function hasEnv(key: keyof typeof env): boolean {
  return env[key] !== undefined && env[key] !== '';
}

/**
 * Get boolean environment variable
 */
export function getBooleanEnv(key: keyof typeof env): boolean {
  const value = env[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return false;
}

/**
 * Get number environment variable
 */
export function getNumberEnv(key: keyof typeof env): number {
  const value = env[key];
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseInt(value, 10);
  return 0;
}

