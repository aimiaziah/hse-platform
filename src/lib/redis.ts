// src/lib/redis.ts - Redis Client Configuration
import Redis from 'ioredis';
import { logger } from './logger';

// Redis configuration
const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_TLS_URL;
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

let redis: Redis | null = null;
let isRedisAvailable = false;

/**
 * Initialize Redis client
 */
function initializeRedis(): Redis | null {
  try {
    // If REDIS_URL is provided, use it (for managed Redis like Upstash, Redis Cloud, etc.)
    if (REDIS_URL) {
      redis = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        reconnectOnError(err) {
          const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
          return targetErrors.some((targetError) => err.message.includes(targetError));
        },
      });
    } else {
      // Use host/port configuration
      redis = new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASSWORD,
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        lazyConnect: true, // Don't connect immediately
      });
    }

    // Handle connection events
    redis.on('connect', () => {
      logger.info('✅ Redis connected');
      isRedisAvailable = true;
    });

    redis.on('error', (err) => {
      logger.error('❌ Redis connection error:', err);
      isRedisAvailable = false;
    });

    redis.on('close', () => {
      logger.warn('⚠️  Redis connection closed');
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
