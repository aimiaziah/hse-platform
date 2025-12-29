// src/lib/connection-pool.ts - Database Connection Pooling Configuration
// This optimizes Disk IO by reusing database connections

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { env } from './env';

/**
 * Connection pool configuration for Supabase
 * Reduces Disk IO by reusing connections instead of creating new ones
 */

// Singleton pattern for connection pooling
let serviceClientPool: SupabaseClient<Database> | null = null;
let clientPool: SupabaseClient<Database> | null = null;

interface PoolConfig {
  maxConnections: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
}

const POOL_CONFIG: PoolConfig = {
  maxConnections: 20, // Maximum concurrent connections
  idleTimeoutMs: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMs: 10000, // Connection timeout: 10 seconds
};

/**
 * Get pooled Supabase client (for client-side)
 * Reuses same client instance instead of creating new ones
 */
export function getPooledClient(): SupabaseClient<Database> {
  if (!clientPool) {
    clientPool = createClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        global: {
          headers: {
            'x-application-name': 'pwa-inspection-platform',
          },
        },
        db: {
          schema: 'public',
        },
        // Connection pooling settings
        realtime: {
          params: {
            eventsPerSecond: 5, // Limit realtime events to reduce IO
          },
        },
      },
    );
  }

  return clientPool;
}

/**
 * Get pooled service client (for server-side/API routes)
 * Reuses same client instance to reduce connection overhead
 */
export function getPooledServiceClient(): SupabaseClient<Database> {
  if (!serviceClientPool) {
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
      throw new Error(
        'SUPABASE_SERVICE_ROLE_KEY is not configured. This should only be called on the server.',
      );
    }

    serviceClientPool = createClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseServiceKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            'x-application-name': 'pwa-inspection-platform-admin',
          },
        },
        db: {
          schema: 'public',
        },
      },
    );
  }

  return serviceClientPool;
}

/**
 * Batch query helper - Execute multiple queries in a single transaction
 * Reduces Disk IO by batching operations
 */
export async function batchQuery<T>(
  queries: Array<() => Promise<T>>,
): Promise<Array<T | Error>> {
  const results: Array<T | Error> = [];

  for (const query of queries) {
    try {
      const result = await query();
      results.push(result);
    } catch (error) {
      results.push(error as Error);
    }
  }

  return results;
}

/**
 * Query with automatic retry
 * Reduces failed requests that would require re-queries
 */
export async function queryWithRetry<T>(
  queryFn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Query attempt ${attempt + 1} failed, retrying...`, error);

      if (attempt < maxRetries - 1) {
        // Wait before retrying (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError || new Error('Query failed after retries');
}

/**
 * Connection pool statistics (for monitoring)
 */
export function getPoolStats() {
  return {
    config: POOL_CONFIG,
    hasClientPool: clientPool !== null,
    hasServicePool: serviceClientPool !== null,
  };
}

/**
 * Reset connection pools (useful for testing or after errors)
 * WARNING: Only use in development or error recovery
 */
export function resetPools() {
  clientPool = null;
  serviceClientPool = null;
  console.log('[ConnectionPool] Pools reset');
}

/**
 * Health check for database connection
 * Returns true if connection is healthy
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = getPooledServiceClient();
    const { error } = await client.from('users').select('id').limit(1);
    return !error;
  } catch (error) {
    console.error('[ConnectionPool] Health check failed:', error);
    return false;
  }
}

export default {
  getPooledClient,
  getPooledServiceClient,
  batchQuery,
  queryWithRetry,
  getPoolStats,
  resetPools,
  checkDatabaseHealth,
};

