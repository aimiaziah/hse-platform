// src/lib/supabase.ts - Supabase Client Configuration
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { env } from './env';
import { logger } from './logger';

// ✅ SECURITY: Use validated environment variables
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Client-side Supabase client
 * Uses anon key, suitable for browser usage
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
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
  },
);

/**
 * Server-side Supabase client for API routes
 * Uses service role key for admin operations (use with caution)
 */
export const getServiceSupabase = (): SupabaseClient<Database> => {
  // ✅ SECURITY: Use validated environment variable
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured. This should only be called on the server.');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

/**
 * Get authenticated user from session
 */
export async function getAuthenticatedUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Get user profile with permissions
 */
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('v_users_with_permissions')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    logger.error('Error fetching user profile', error, { userId });
    return null;
  }

  return data;
}

/**
 * Check if user has specific permission
 */
export async function checkUserPermission(
  userId: string,
  permission: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_permissions')
    .select(permission)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return false;
  }

  return data[permission] === true;
}

/**
 * Log to audit trail
 */
export async function logAuditTrail(params: {
  userId?: string;
  userName?: string;
  userRole?: string;
  action: string;
  entityType: string;
  entityId?: string;
  description?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  requestMethod?: string;
  requestPath?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}) {
  try {
    const { error } = await (supabase.from('audit_trail') as any).insert({
      user_id: params.userId || null,
      user_name: params.userName || null,
      user_role: params.userRole || null,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      description: params.description || null,
      old_values: params.oldValues || null,
      new_values: params.newValues || null,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
      request_method: params.requestMethod || null,
      request_path: params.requestPath || null,
      severity: params.severity || 'info',
    } as any);

    if (error) {
      logger.error('Error logging audit trail', error, params);
    }
  } catch (error) {
    logger.error('Audit trail logging failed', error, params);
  }
}

/**
 * Log security event
 */
export async function logSecurityEvent(params: {
  eventType: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  description: string;
  metadata?: any;
  riskLevel?: number;
  requiresAction?: boolean;
}) {
  try {
    const { error } = await (supabase.from('security_logs') as any).insert({
      event_type: params.eventType,
      severity: params.severity,
      user_id: params.userId || null,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
      description: params.description,
      metadata: params.metadata || null,
      risk_level: params.riskLevel || 0,
      requires_action: params.requiresAction || false,
    } as any);

    if (error) {
      logger.error('Error logging security event', error, params);
    }
  } catch (error) {
    logger.error('Security logging failed', error, params);
  }
}

/**
 * Create notification for user
 */
export async function createNotification(params: {
  userId: string;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  relatedEntityType?: string;
  relatedEntityId?: string;
  expiresAt?: Date;
}) {
  try {
    const { error } = await (supabase.from('notifications') as any).insert({
      user_id: params.userId,
      title: params.title,
      message: params.message,
      type: params.type || 'info',
      related_entity_type: params.relatedEntityType || null,
      related_entity_id: params.relatedEntityId || null,
      expires_at: params.expiresAt?.toISOString() || null,
    } as any);

    if (error) {
      logger.error('Error creating notification', error, params);
    }
  } catch (error) {
    logger.error('Notification creation failed', error, params);
  }
}

export default supabase;
