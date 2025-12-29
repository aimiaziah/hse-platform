// src/lib/query-optimizer.ts - Query Optimization Helpers
// Reduces Disk IO by optimizing common query patterns

import { getServiceSupabase } from './supabase';
import { cachedFetch, getCacheKey, CACHE_PREFIX, CACHE_TTL } from './cache';
import { logger } from './logger';

/**
 * Get job queue status with caching
 * Reduces frequent polling of job_queue table
 */
export async function getCachedJobQueueStatus() {
  const cacheKey = `${CACHE_PREFIX.JOB_QUEUE}status`;

  return cachedFetch(
    cacheKey,
    async () => {
      const supabase = getServiceSupabase();

      // Use optimized query with indexes
      const [pendingResult, processingResult, failedResult, recentResult] = await Promise.all([
        // Count pending jobs (uses idx_job_queue_pending)
        supabase
          .from('job_queue')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
          .lte('scheduled_at', new Date().toISOString()),

        // Count processing jobs
        supabase
          .from('job_queue')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'processing'),

        // Count failed jobs
        supabase
          .from('job_queue')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'failed'),

        // Get recent jobs (limited to 10)
        supabase.from('job_queue').select('*').order('created_at', { ascending: false }).limit(10),
      ]);

      return {
        pending: pendingResult.count || 0,
        processing: processingResult.count || 0,
        failed: failedResult.count || 0,
        recentJobs: recentResult.data || [],
      };
    },
    CACHE_TTL.JOB_QUEUE_STATUS,
  );
}

/**
 * Get pending inspections count (optimized)
 * Uses index instead of full table scan
 */
export async function getCachedPendingInspectionsCount(userId?: string) {
  const cacheKey = userId
    ? `${CACHE_PREFIX.PENDING_INSPECTIONS}:count:${userId}`
    : `${CACHE_PREFIX.PENDING_INSPECTIONS}:count:all`;

  return cachedFetch(
    cacheKey,
    async () => {
      const supabase = getServiceSupabase();

      let query = supabase
        .from('inspections')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_review');

      if (userId) {
        query = query.eq('inspector_id', userId);
      }

      const { count, error } = await query;

      if (error) {
        logger.error('Error fetching pending inspections count', error);
        return 0;
      }

      return count || 0;
    },
    CACHE_TTL.PENDING_INSPECTIONS,
  );
}

/**
 * Batch fetch multiple inspections by IDs
 * More efficient than individual queries
 */
export async function batchFetchInspections(inspectionIds: string[]) {
  if (inspectionIds.length === 0) return [];

  const supabase = getServiceSupabase();

  const { data, error } = await supabase.from('inspections').select('*').in('id', inspectionIds);

  if (error) {
    logger.error('Error batch fetching inspections', error);
    return [];
  }

  return data || [];
}

/**
 * Get inspection statistics (optimized with materialized view)
 * Uses mv_inspection_stats instead of live aggregation
 */
export async function getCachedInspectionStats(startDate: string, endDate: string) {
  const cacheKey = `${CACHE_PREFIX.ANALYTICS}stats:${startDate}:${endDate}`;

  return cachedFetch(
    cacheKey,
    async () => {
      const supabase = getServiceSupabase();

      // Try to use materialized view first (if migration was run)
      const { data: mvData, error: mvError } = await supabase
        .from('mv_inspection_stats')
        .select('*')
        .gte('inspection_date', startDate)
        .lte('inspection_date', endDate);

      if (!mvError && mvData) {
        return mvData;
      }

      // Fallback to regular query if materialized view doesn't exist
      const { data, error } = await supabase
        .from('inspections')
        .select('inspection_type, status, created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (error) {
        logger.error('Error fetching inspection stats', error);
        return [];
      }

      // Aggregate in memory (less efficient but works)
      const stats = new Map();
      data?.forEach((inspection) => {
        const date = inspection.created_at.split('T')[0];
        const key = `${inspection.inspection_type}:${inspection.status}:${date}`;

        if (!stats.has(key)) {
          stats.set(key, {
            inspection_type: inspection.inspection_type,
            status: inspection.status,
            inspection_date: date,
            count: 0,
          });
        }

        stats.get(key).count++;
      });

      return Array.from(stats.values());
    },
    CACHE_TTL.ANALYTICS,
  );
}

/**
 * Optimized query for user's recent inspections
 * Uses composite index idx_inspections_user_status_date
 */
export async function getUserRecentInspections(userId: string, limit: number = 10) {
  const cacheKey = `${CACHE_PREFIX.INSPECTIONS_LIST}${userId}:recent:${limit}`;

  return cachedFetch(
    cacheKey,
    async () => {
      const supabase = getServiceSupabase();

      // This query will use idx_inspections_user_status_date index
      const { data, error } = await supabase
        .from('inspections')
        .select('id, inspection_number, inspection_type, status, created_at, inspection_date')
        .eq('inspector_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Error fetching user recent inspections', error);
        return [];
      }

      return data || [];
    },
    CACHE_TTL.INSPECTION_LIST,
  );
}

/**
 * Invalidate cache for specific patterns
 * Call this after data mutations
 */
export async function invalidateCache(pattern: string) {
  try {
    // If Redis is available, use it
    const redis = (await import('./redis')).default;
    if (redis) {
      const keys = await redis.keys(`${pattern}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.info(`Invalidated ${keys.length} cache keys matching: ${pattern}`);
      }
    }
  } catch (error) {
    // Redis not available or error - that's okay, cache will expire naturally
    logger.warn('Cache invalidation skipped (Redis not available)', error);
  }
}

/**
 * Invalidate all inspection-related caches
 * Call after creating/updating inspections
 */
export async function invalidateInspectionCaches(userId?: string) {
  await Promise.all([
    invalidateCache(CACHE_PREFIX.INSPECTIONS_LIST),
    invalidateCache(CACHE_PREFIX.PENDING_INSPECTIONS),
    invalidateCache(CACHE_PREFIX.ANALYTICS),
    userId ? invalidateCache(`${CACHE_PREFIX.INSPECTIONS_LIST}${userId}`) : Promise.resolve(),
  ]);
}

/**
 * Invalidate job queue caches
 * Call after processing jobs
 */
export async function invalidateJobQueueCaches() {
  await invalidateCache(CACHE_PREFIX.JOB_QUEUE);
}

/**
 * Warm up cache with frequently accessed data
 * Call this on server startup or periodically
 */
export async function warmUpCache() {
  try {
    logger.info('Warming up cache...');

    // Pre-fetch commonly accessed data
    await Promise.all([
      getCachedJobQueueStatus(),
      // Add more warm-up queries as needed
    ]);

    logger.info('Cache warm-up complete');
  } catch (error) {
    logger.error('Cache warm-up failed', error);
  }
}

export default {
  getCachedJobQueueStatus,
  getCachedPendingInspectionsCount,
  batchFetchInspections,
  getCachedInspectionStats,
  getUserRecentInspections,
  invalidateCache,
  invalidateInspectionCaches,
  invalidateJobQueueCaches,
  warmUpCache,
};
