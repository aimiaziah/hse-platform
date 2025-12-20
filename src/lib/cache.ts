// src/lib/cache.ts - Caching Utility
import { getRedisClient, isRedisConnected } from './redis';
import { logger } from './logger';

/**
 * Cache TTL (Time To Live) configurations in seconds
 */
export const CACHE_TTL = {
  // User data - 5 minutes (frequently updated)
  USER_PROFILE: 5 * 60,
  USER_PERMISSIONS: 5 * 60,

  // Reference data - 1 hour (rarely changes)
  LOCATIONS: 60 * 60,
  FORM_TEMPLATES: 60 * 60,
  ASSETS: 30 * 60,

  // Analytics - 15 minutes (can be slightly stale)
  ANALYTICS_DASHBOARD: 15 * 60,
  ANALYTICS_SUMMARY: 30 * 60,

  // Audit logs - 2 minutes (for dashboards)
  AUDIT_LOGS: 2 * 60,
  SECURITY_LOGS: 2 * 60,

  // Inspections - 5 minutes (moderate updates)
  INSPECTION_DETAILS: 5 * 60,
  INSPECTION_LIST: 3 * 60,
  PENDING_INSPECTIONS: 2 * 60,

  // Short-lived cache - 1 minute
  SHORT: 60,

  // Long-lived cache - 24 hours
  LONG: 24 * 60 * 60,
};

/**
 * Cache key prefixes for organization
 */
export const CACHE_PREFIX = {
  USER: 'user',
  USER_PERMISSIONS: 'user_perms',
  LOCATION: 'location',
  LOCATIONS_LIST: 'locations_list',
  FORM_TEMPLATE: 'form_template',
  ASSET: 'asset',
  ASSETS_LIST: 'assets_list',
  INSPECTION: 'inspection',
  INSPECTIONS_LIST: 'inspections_list',
  PENDING_INSPECTIONS: 'pending_inspections',
  ANALYTICS: 'analytics',
  AUDIT_LOGS: 'audit_logs',
  SECURITY_LOGS: 'security_logs',
};

/**
 * Generate cache key with prefix
 */
export function getCacheKey(prefix: string, identifier: string): string {
  return `${prefix}:${identifier}`;
}

/**
 * Get value from cache
 */
export async function getCache<T>(key: string): Promise<T | null> {
  if (!isRedisConnected()) {
    return null;
  }

  try {
    const redis = getRedisClient();
    if (!redis) return null;

    const value = await redis.get(key);

    if (!value) {
      return null;
    }

    return JSON.parse(value) as T;
  } catch (error) {
    logger.error('Cache get error:', error, { key });
    return null;
  }
}

/**
 * Set value in cache with TTL
 */
export async function setCache(key: string, value: any, ttl: number = CACHE_TTL.SHORT): Promise<boolean> {
  if (!isRedisConnected()) {
    return false;
  }

  try {
    const redis = getRedisClient();
    if (!redis) return false;

    const serialized = JSON.stringify(value);
    await redis.setex(key, ttl, serialized);

    return true;
  } catch (error) {
    logger.error('Cache set error:', error, { key, ttl });
    return false;
  }
}

/**
 * Delete value from cache
 */
export async function deleteCache(key: string): Promise<boolean> {
  if (!isRedisConnected()) {
    return false;
  }

  try {
    const redis = getRedisClient();
    if (!redis) return false;

    await redis.del(key);
    return true;
  } catch (error) {
    logger.error('Cache delete error:', error, { key });
    return false;
  }
}

/**
 * Delete multiple keys matching a pattern
 */
export async function deleteCachePattern(pattern: string): Promise<number> {
  if (!isRedisConnected()) {
    return 0;
  }

  try {
    const redis = getRedisClient();
    if (!redis) return 0;

    const keys = await redis.keys(pattern);

    if (keys.length === 0) {
      return 0;
    }

    await redis.del(...keys);
    return keys.length;
  } catch (error) {
    logger.error('Cache delete pattern error:', error, { pattern });
    return 0;
  }
}

/**
 * Cached fetch wrapper - gets from cache or executes function and caches result
 */
export async function cachedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = CACHE_TTL.SHORT,
): Promise<T> {
  // Try to get from cache first
  const cached = await getCache<T>(key);

  if (cached !== null) {
    logger.debug('Cache hit', { key });
    return cached;
  }

  logger.debug('Cache miss', { key });

  // Execute fetch function
  const data = await fetchFn();

  // Cache the result (fire and forget - don't wait)
  setCache(key, data, ttl).catch((err) => {
    logger.error('Failed to cache result:', err, { key });
  });

  return data;
}

/**
 * Invalidate user-related cache
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  await deleteCache(getCacheKey(CACHE_PREFIX.USER, userId));
  await deleteCache(getCacheKey(CACHE_PREFIX.USER_PERMISSIONS, userId));
  logger.info('User cache invalidated', { userId });
}

/**
 * Invalidate location cache
 */
export async function invalidateLocationCache(locationId?: string): Promise<void> {
  if (locationId) {
    await deleteCache(getCacheKey(CACHE_PREFIX.LOCATION, locationId));
  }
  await deleteCache(CACHE_PREFIX.LOCATIONS_LIST);
  logger.info('Location cache invalidated', { locationId });
}

/**
 * Invalidate inspection cache
 */
export async function invalidateInspectionCache(inspectionId?: string): Promise<void> {
  if (inspectionId) {
    await deleteCache(getCacheKey(CACHE_PREFIX.INSPECTION, inspectionId));
  }
  // Also invalidate lists
  await deleteCachePattern(`${CACHE_PREFIX.INSPECTIONS_LIST}:*`);
  await deleteCachePattern(`${CACHE_PREFIX.PENDING_INSPECTIONS}:*`);
  logger.info('Inspection cache invalidated', { inspectionId });
}

/**
 * Invalidate all analytics cache
 */
export async function invalidateAnalyticsCache(): Promise<void> {
  const count = await deleteCachePattern(`${CACHE_PREFIX.ANALYTICS}:*`);
  logger.info('Analytics cache invalidated', { count });
}

/**
 * Clear all cache (use with caution)
 */
export async function clearAllCache(): Promise<void> {
  if (!isRedisConnected()) {
    return;
  }

  try {
    const redis = getRedisClient();
    if (!redis) return;

    await redis.flushdb();
    logger.warn('All cache cleared');
  } catch (error) {
    logger.error('Clear all cache error:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  connected: boolean;
  keyCount: number;
  memoryUsed?: string;
}> {
  if (!isRedisConnected()) {
    return { connected: false, keyCount: 0 };
  }

  try {
    const redis = getRedisClient();
    if (!redis) return { connected: false, keyCount: 0 };

    const dbsize = await redis.dbsize();
    const info = await redis.info('memory');

    // Parse memory usage from info string
    const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
    const memoryUsed = memoryMatch ? memoryMatch[1] : undefined;

    return {
      connected: true,
      keyCount: dbsize,
      memoryUsed,
    };
  } catch (error) {
    logger.error('Get cache stats error:', error);
    return { connected: false, keyCount: 0 };
  }
}
