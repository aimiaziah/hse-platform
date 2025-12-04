// Enhanced Rate Limiter with Redis Support
// Automatically uses Redis in production and in-memory storage in development
import { NextApiRequest, NextApiResponse } from 'next';
import Redis from 'ioredis';
import { getRateLimitConfig } from './auth-config';
import { logger } from './logger';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Redis client singleton
 */
let redisClient: Redis | null = null;

/**
 * In-memory fallback store
 */
const memoryStore = new Map<string, RateLimitEntry>();

/**
 * Initialize Redis client (production only)
 */
function getRedisClient(): Redis | null {
  // Only use Redis in production
  if (process.env.NODE_ENV !== 'production') {
    return null;
  }

  // Return existing client
  if (redisClient) {
    return redisClient;
  }

  // Create new Redis client if URL is configured
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    logger.warn('REDIS_URL not configured, using in-memory rate limiting');
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: true,
    });

    redisClient.on('error', (error) => {
      logger.error('Redis connection error', error);
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected for rate limiting');
    });

    // Connect to Redis
    redisClient.connect().catch((error) => {
      logger.error('Failed to connect to Redis', error);
      redisClient = null;
    });

    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis client', error);
    return null;
  }
}

/**
 * Get client identifier (IP address)
 */
function getClientIdentifier(req: NextApiRequest): string {
  // Try to get real IP from headers (for proxy/load balancer scenarios)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  // Fallback to socket address
  return req.socket.remoteAddress || 'unknown';
}

/**
 * Clean up expired entries from memory store
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  const entries = Array.from(memoryStore.entries());
  for (const [key, entry] of entries) {
    if (now > entry.resetTime) {
      memoryStore.delete(key);
    }
  }
}

/**
 * Check rate limit using Redis
 */
async function checkRateLimitRedis(
  redis: Redis,
  clientId: string,
  config: { maxRequests: number; windowMs: number }
): Promise<{
  limited: boolean;
  remaining: number;
  resetTime: number;
}> {
  const now = Date.now();
  const resetTime = now + config.windowMs;

  try {
    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline();
    pipeline.get(clientId);
    pipeline.pttl(clientId);

    const results = await pipeline.exec();

    if (!results) {
      throw new Error('Redis pipeline failed');
    }

    const [countResult, ttlResult] = results;
    let count = countResult[1] ? parseInt(countResult[1] as string, 10) : 0;
    const ttl = ttlResult[1] ? parseInt(ttlResult[1] as string, 10) : -1;

    // Increment counter
    count++;

    // Set or update counter with TTL
    if (ttl === -1) {
      // First request, set with expiry
      await redis.set(clientId, count.toString(), 'PX', config.windowMs);
    } else {
      // Increment existing counter
      await redis.incr(clientId);
    }

    const limited = count > config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - count);
    const actualResetTime = ttl > 0 ? now + ttl : resetTime;

    return {
      limited,
      remaining,
      resetTime: actualResetTime,
    };
  } catch (error) {
    logger.error('Redis rate limit check failed, falling back to memory', error);
    // Fallback to memory on Redis error
    return checkRateLimitMemory(clientId, config);
  }
}

/**
 * Check rate limit using in-memory storage
 */
function checkRateLimitMemory(
  clientId: string,
  config: { maxRequests: number; windowMs: number }
): {
  limited: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();

  // Clean up old entries periodically
  if (Math.random() < 0.01) {
    cleanupExpiredEntries();
  }

  let entry = memoryStore.get(clientId);

  // Create new entry if doesn't exist or expired
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    memoryStore.set(clientId, entry);
  }

  // Increment counter
  entry.count++;

  // Check if limit exceeded
  const limited = entry.count > config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);

  return {
    limited,
    remaining,
    resetTime: entry.resetTime,
  };
}

/**
 * Check if request should be rate limited
 * Automatically uses Redis in production, memory in development
 */
export async function checkRateLimit(
  req: NextApiRequest,
  prefix: string = 'auth'
): Promise<{
  limited: boolean;
  remaining: number;
  resetTime: number;
}> {
  const config = getRateLimitConfig();
  const clientId = `${prefix}:${getClientIdentifier(req)}`;

  // Try Redis first (production only)
  const redis = getRedisClient();
  if (redis && redis.status === 'ready') {
    return checkRateLimitRedis(redis, clientId, config);
  }

  // Fallback to memory storage
  return checkRateLimitMemory(clientId, config);
}

/**
 * Rate limiting middleware
 */
export async function rateLimitMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  prefix: string = 'auth'
): Promise<boolean> {
  const { limited, remaining, resetTime } = await checkRateLimit(req, prefix);

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', getRateLimitConfig().maxRequests.toString());
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
  res.setHeader('X-RateLimit-Reset', Math.floor(resetTime / 1000).toString());

  if (limited) {
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
    res.setHeader('Retry-After', retryAfter.toString());

    // Log security event
    logger.security('RATE_LIMIT_EXCEEDED', {
      prefix,
      ip: getClientIdentifier(req),
      path: req.url,
    });

    res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again later.',
      retryAfter,
    });
    return true;
  }

  return false;
}

/**
 * Reset rate limit for a specific client
 */
export async function resetRateLimit(
  req: NextApiRequest,
  prefix: string = 'auth'
): Promise<void> {
  const clientId = `${prefix}:${getClientIdentifier(req)}`;

  // Try Redis first
  const redis = getRedisClient();
  if (redis && redis.status === 'ready') {
    try {
      await redis.del(clientId);
      return;
    } catch (error) {
      logger.error('Failed to reset rate limit in Redis', error);
    }
  }

  // Fallback to memory
  memoryStore.delete(clientId);
}

/**
 * Gracefully close Redis connection
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
