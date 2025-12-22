// src/lib/redis.ts - Redis Client Configuration
import Redis from 'ioredis';
import { logger } from './logger';

// Redis configuration
const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_TLS_URL;
const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

// Check if Redis is explicitly configured
const REDIS_ENABLED = !!(REDIS_URL || REDIS_HOST);

let redis: Redis | null = null;
let isRedisAvailable = false;
let initializationLogged = false;

/**
 * Initialize Redis client
 */
function initializeRedis(): Redis | null {
  // Don't initialize if Redis is not explicitly configured
  if (!REDIS_ENABLED) {
    if (!initializationLogged) {
      logger.info(
        'ℹ️  Redis not configured - caching disabled (this is fine, app works without Redis)',
      );
      initializationLogged = true;
    }
    return null;
  }

  try {
    // If REDIS_URL is provided, use it (for managed Redis like Upstash, Redis Cloud, etc.)
    if (REDIS_URL) {
      redis = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          // Stop retrying after 5 attempts
          if (times > 5) {
            logger.warn('⚠️  Redis max retries reached, giving up');
            return null; // Stop retrying
          }
          const delay = Math.min(times * 100, 2000);
          return delay;
        },
        reconnectOnError(err) {
          const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
          return targetErrors.some((targetError) => err.message.includes(targetError));
        },
      });
    } else if (REDIS_HOST) {
      // Use host/port configuration only if REDIS_HOST is explicitly set
      redis = new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASSWORD,
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          // Stop retrying after 5 attempts
          if (times > 5) {
            logger.warn('⚠️  Redis max retries reached, giving up');
            return null; // Stop retrying
          }
          const delay = Math.min(times * 100, 2000);
          return delay;
        },
        lazyConnect: true,
      });
    }

    if (!redis) {
      return null;
    }

    // Handle connection events
    redis.on('connect', () => {
      logger.info('✅ Redis connected');
      isRedisAvailable = true;
    });

    redis.on('error', (err) => {
      // Only log error once, not repeatedly
      if (isRedisAvailable) {
        logger.error('❌ Redis connection error:', { error: err.message });
      }
      isRedisAvailable = false;
    });

    redis.on('close', () => {
      if (isRedisAvailable) {
        logger.warn('⚠️  Redis connection closed');
      }
      isRedisAvailable = false;
    });

    // Test connection
    redis
      .ping()
      .then(() => {
        isRedisAvailable = true;
        logger.info('✅ Redis ping successful');
      })
      .catch((err) => {
        logger.warn('⚠️  Redis not available, caching disabled:', err.message);
        isRedisAvailable = false;
        // Disconnect to prevent further retry attempts
        if (redis) {
          redis.disconnect();
          redis = null;
        }
      });

    return redis;
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    isRedisAvailable = false;
    return null;
  }
}

/**
 * Get Redis client (lazy initialization)
 */
export function getRedisClient(): Redis | null {
  if (!redis) {
    redis = initializeRedis();
  }
  return redis;
}

/**
 * Check if Redis is available
 */
export function isRedisConnected(): boolean {
  return isRedisAvailable && redis !== null;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    isRedisAvailable = false;
  }
}

// Initialize on module load (server-side only)
if (typeof window === 'undefined') {
  getRedisClient();
}

export default getRedisClient;
