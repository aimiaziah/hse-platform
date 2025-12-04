// src/pages/api/supabase/assets/index.ts - Assets CRUD API
import { NextApiResponse } from 'next';
import { withRBAC, AuthenticatedRequest } from '@/lib/supabase-middleware';
import { getServiceSupabase, logAuditTrail } from '@/lib/supabase';

/**
 * GET /api/supabase/assets - List all assets
 * POST /api/supabase/assets - Create new asset
 */
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const supabase = getServiceSupabase();

  try {
    // GET - List all assets
    if (req.method === 'GET') {
      const {
        asset_type,
        location_id,
        is_active,
        status,
        limit = '100',
        offset = '0',
      } = req.query;

      let query = supabase.from('assets').select('*, locations(name)', { count: 'exact' });

      // Apply filters
      if (asset_type) {
        query = query.eq('asset_type', asset_type);
      }
      if (location_id) {
        query = query.eq('location_id', location_id);
      }
      if (is_active !== undefined) {
        query = query.eq('is_active', is_active === 'true');
      }

      // Apply pagination
      query = query
        .order('created_at', { ascending: false })
        .range(
          parseInt(offset as string),
          parseInt(offset as string) + parseInt(limit as string) - 1,
        );

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching assets:', error);
        return res.status(500).json({ error: 'Failed to fetch assets' });
      }

      // If status filter is provided, filter by inspection status
      let filteredData = data;
      if (status && data) {
        const now = new Date();
        filteredData = data.filter((asset: any) => {
          const expiryDate = asset.expiry_date ? new Date(asset.expiry_date) : null;
          const lastInspection = asset.last_inspection_date
            ? new Date(asset.last_inspection_date)
            : null;

          let assetStatus = 'ok';

          if (expiryDate && expiryDate < now) {
            assetStatus = 'expired';
          } else if (expiryDate && expiryDate <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
            assetStatus = 'expiring_soon';
          } else if (!lastInspection) {
            assetStatus = 'never_inspected';
          } else if (lastInspection < new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)) {
            assetStatus = 'overdue';
          }

          return status === assetStatus;
        });
      }

      return res.status(200).json({
        success: true,
        data: filteredData,
        pagination: {
          total: count || 0,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      });
    }

    // POST - Create new asset
    if (req.method === 'POST') {
      const {
        asset_type,
        serial_number,
        asset_number,
        location_id,
        type_size,
        expiry_date,
        metadata,
      } = req.body;

      // Validate required fields
      if (!asset_type || !serial_number) {
        return res.status(400).json({ error: 'Asset type and serial number are required' });
      }

      // Check if asset with serial number already exists
      const { data: existing } = await supabase
        .from('assets')
        .select('id')
        .eq('serial_number', serial_number)
        .single();

      if (existing) {
        return res
          .status(409)
          .json({ error: 'Asset with this serial number already exists' });
      }

      // Create asset
      const { data: asset, error: createError } = await (supabase
        .from('assets') as any)
        .insert({
          asset_type,
          serial_number,
          asset_number: asset_number || null,
          location_id: location_id || null,
          type_size: type_size || null,
          expiry_date: expiry_date || null,
          metadata: metadata || null,
          is_active: true,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating asset:', createError);
        return res.status(500).json({ error: 'Failed to create asset' });
      }

      // Log audit trail
      await logAuditTrail({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'CREATE',
        entityType: 'asset',
        entityId: (asset as any).id,
        description: `Created asset: ${serial_number} (${asset_type})`,
        newValues: asset,
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestMethod: req.method!,
        requestPath: req.url || '',
        severity: 'info',
      });

      return res.status(201).json({
        success: true,
        data: asset,
      });
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Assets API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Export with RBAC middleware - admins, supervisors, and inspectors can view/manage assets
export default withRBAC(handler, {
  requiredRole: ['admin', 'supervisor', 'inspector'],
});
