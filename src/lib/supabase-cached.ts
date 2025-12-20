// src/lib/supabase-cached.ts - Cached Supabase Queries
import { getServiceSupabase } from './supabase';
import { cachedFetch, getCacheKey, CACHE_PREFIX, CACHE_TTL } from './cache';
import { logger } from './logger';
import { Database } from '@/types/database';

type Tables = Database['public']['Tables'];
type UserRow = Tables['users']['Row'];
type LocationRow = Tables['locations']['Row'];
type AssetRow = Tables['assets']['Row'];
type InspectionRow = Tables['inspections']['Row'];
type FormTemplateRow = Tables['form_templates']['Row'];

/**
 * Get user profile with caching
 */
export async function getCachedUserProfile(userId: string): Promise<UserRow | null> {
  const cacheKey = getCacheKey(CACHE_PREFIX.USER, userId);

  return cachedFetch(
    cacheKey,
    async () => {
      const supabase = getServiceSupabase();
      const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();

      if (error) {
        logger.error('Error fetching user profile', error, { userId });
        throw error;
      }

      return data;
    },
    CACHE_TTL.USER_PROFILE,
  );
}

/**
 * Get user with permissions (using view) with caching
 */
export async function getCachedUserWithPermissions(userId: string) {
  const cacheKey = getCacheKey(CACHE_PREFIX.USER_PERMISSIONS, userId);

  return cachedFetch(
    cacheKey,
    async () => {
      const supabase = getServiceSupabase();
      const { data, error } = await supabase
        .from('v_users_with_permissions')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        logger.error('Error fetching user with permissions', error, { userId });
        return null;
      }

      return data;
    },
    CACHE_TTL.USER_PERMISSIONS,
  );
}

/**
 * Get all active locations with caching
 */
export async function getCachedLocations(): Promise<LocationRow[]> {
  const cacheKey = CACHE_PREFIX.LOCATIONS_LIST;

  return cachedFetch(
    cacheKey,
    async () => {
      const supabase = getServiceSupabase();
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        logger.error('Error fetching locations', error);
        throw error;
      }

      return data || [];
    },
    CACHE_TTL.LOCATIONS,
  );
}

/**
 * Get location by ID with caching
 */
export async function getCachedLocation(locationId: string): Promise<LocationRow | null> {
  const cacheKey = getCacheKey(CACHE_PREFIX.LOCATION, locationId);

  return cachedFetch(
    cacheKey,
    async () => {
      const supabase = getServiceSupabase();
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('id', locationId)
        .single();

      if (error) {
        logger.error('Error fetching location', error, { locationId });
        return null;
      }

      return data;
    },
    CACHE_TTL.LOCATIONS,
  );
}

/**
 * Get all active form templates with caching
 */
export async function getCachedFormTemplates(): Promise<FormTemplateRow[]> {
  const cacheKey = `${CACHE_PREFIX.FORM_TEMPLATE}:list:active`;

  return cachedFetch(
    cacheKey,
    async () => {
      const supabase = getServiceSupabase();
      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching form templates', error);
        throw error;
      }

      return data || [];
    },
    CACHE_TTL.FORM_TEMPLATES,
  );
}

/**
 * Get form template by ID with caching
 */
export async function getCachedFormTemplate(templateId: string): Promise<FormTemplateRow | null> {
  const cacheKey = getCacheKey(CACHE_PREFIX.FORM_TEMPLATE, templateId);

  return cachedFetch(
    cacheKey,
    async () => {
      const supabase = getServiceSupabase();
      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) {
        logger.error('Error fetching form template', error, { templateId });
        return null;
      }

      return data;
    },
    CACHE_TTL.FORM_TEMPLATES,
  );
}

/**
 * Get active assets with caching
 */
export async function getCachedAssets(filters?: {
  assetType?: string;
  locationId?: string;
}): Promise<AssetRow[]> {
  // Create cache key based on filters
  const filterKey = filters
    ? `${filters.assetType || 'all'}:${filters.locationId || 'all'}`
    : 'all';
  const cacheKey = `${CACHE_PREFIX.ASSETS_LIST}:${filterKey}`;

  return cachedFetch(
    cacheKey,
    async () => {
      const supabase = getServiceSupabase();
      let query = supabase.from('assets').select('*').eq('is_active', true);

      if (filters?.assetType) {
        query = query.eq('asset_type', filters.assetType);
      }

      if (filters?.locationId) {
        query = query.eq('location_id', filters.locationId);
      }

      const { data, error } = await query.order('serial_number');

      if (error) {
        logger.error('Error fetching assets', error, { filters });
        throw error;
      }

      return data || [];
    },
    CACHE_TTL.ASSETS,
  );
}

/**
 * Get inspection by ID with caching
 */
export async function getCachedInspection(inspectionId: string): Promise<InspectionRow | null> {
  const cacheKey = getCacheKey(CACHE_PREFIX.INSPECTION, inspectionId);

  return cachedFetch(
    cacheKey,
    async () => {
      const supabase = getServiceSupabase();
      const { data, error } = await supabase
        .from('inspections')
        .select('*')
        .eq('id', inspectionId)
        .single();

      if (error) {
        logger.error('Error fetching inspection', error, { inspectionId });
        return null;
      }

      return data;
    },
    CACHE_TTL.INSPECTION_DETAILS,
  );
}

/**
 * Get pending inspections with caching
 */
export async function getCachedPendingInspections() {
  const cacheKey = CACHE_PREFIX.PENDING_INSPECTIONS;

  return cachedFetch(
    cacheKey,
    async () => {
      const supabase = getServiceSupabase();
      const { data, error } = await supabase
        .from('v_pending_inspections')
        .select('*')
        .order('submitted_at', { ascending: true });

      if (error) {
        logger.error('Error fetching pending inspections', error);
        throw error;
      }

      return data || [];
    },
    CACHE_TTL.PENDING_INSPECTIONS,
  );
}

/**
 * Get inspections for a user with caching
 */
export async function getCachedUserInspections(
  userId: string,
  filters?: {
    status?: string;
    limit?: number;
  },
) {
  // Create cache key based on filters
  const filterKey = `${userId}:${filters?.status || 'all'}:${filters?.limit || 'all'}`;
  const cacheKey = `${CACHE_PREFIX.INSPECTIONS_LIST}:${filterKey}`;

  return cachedFetch(
    cacheKey,
    async () => {
      const supabase = getServiceSupabase();
      let query = supabase
        .from('inspections')
        .select('*')
        .eq('inspector_id', userId)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching user inspections', error, { userId, filters });
        throw error;
      }

      return data || [];
    },
    CACHE_TTL.INSPECTION_LIST,
  );
}

/**
 * Get analytics dashboard data with caching
 */
export async function getCachedAnalyticsDashboard(periodStart: string, periodEnd: string) {
  const cacheKey = `${CACHE_PREFIX.ANALYTICS}:dashboard:${periodStart}:${periodEnd}`;

  return cachedFetch(
    cacheKey,
    async () => {
      const supabase = getServiceSupabase();
      const { data, error } = await supabase
        .from('analytics_summary')
        .select('*')
        .gte('period_start', periodStart)
        .lte('period_end', periodEnd)
        .single();

      if (error) {
        logger.error('Error fetching analytics dashboard', error, { periodStart, periodEnd });
        return null;
      }

      return data;
    },
    CACHE_TTL.ANALYTICS_DASHBOARD,
  );
}
