// src/pages/api/supabase/locations/index.ts - Locations CRUD API
import { NextApiResponse } from 'next';
import { withRBAC, AuthenticatedRequest } from '@/lib/supabase-middleware';
import { getServiceSupabase, logAuditTrail } from '@/lib/supabase';
import { getCachedLocations } from '@/lib/supabase-cached';
import { invalidateLocationCache } from '@/lib/cache';

/**
 * GET /api/supabase/locations - List all locations
 * POST /api/supabase/locations - Create new location
 */
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const supabase = getServiceSupabase();

  try {
    // GET - List all locations
    if (req.method === 'GET') {
      const { is_active, limit = '100', offset = '0' } = req.query;

      // Use cached locations for simple queries (most common case)
      if (is_active === 'true' && offset === '0' && parseInt(limit as string) >= 100) {
        try {
          const cachedData = await getCachedLocations();
          return res.status(200).json({
            success: true,
            data: cachedData,
            cached: true,
            pagination: {
              total: cachedData.length,
              limit: cachedData.length,
              offset: 0,
            },
          });
        } catch (error) {
          console.warn('Cache miss, falling back to database');
        }
      }

      // Complex query or cache miss - query database directly
      let query = supabase.from('locations').select('*', { count: 'exact' });

      // Apply filters
      if (is_active !== undefined) {
        query = query.eq('is_active', is_active === 'true');
      }

      // Apply pagination
      query = query
        .order('name', { ascending: true })
        .range(
          parseInt(offset as string),
          parseInt(offset as string) + parseInt(limit as string) - 1,
        );

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching locations:', error);
        return res.status(500).json({ error: 'Failed to fetch locations' });
      }

      return res.status(200).json({
        success: true,
        data,
        pagination: {
          total: count || 0,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      });
    }

    // POST - Create new location
    if (req.method === 'POST') {
      const { name, description } = req.body;

      // Validate required fields
      if (!name) {
        return res.status(400).json({ error: 'Location name is required' });
      }

      // Check if location already exists
      const { data: existing } = await supabase
        .from('locations')
        .select('id')
        .eq('name', name)
        .single();

      if (existing) {
        return res.status(409).json({ error: 'Location with this name already exists' });
      }

      // Create location
      const { data: location, error: createError } = await (supabase.from('locations') as any)
        .insert({
          name,
          description: description || null,
          is_active: true,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating location:', createError);
        return res.status(500).json({ error: 'Failed to create location' });
      }

      // Invalidate cache
      await invalidateLocationCache();

      // Log audit trail
      await logAuditTrail({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'CREATE',
        entityType: 'location',
        entityId: (location as any).id,
        description: `Created location: ${name}`,
        newValues: location,
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestMethod: req.method!,
        requestPath: req.url || '',
        severity: 'info',
      });

      return res.status(201).json({
        success: true,
        data: location,
      });
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Locations API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Export with RBAC middleware - admins and supervisors can manage locations
export default withRBAC(handler, {
  requiredRole: ['admin', 'supervisor'],
});
