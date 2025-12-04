// src/pages/api/supabase/assets/[id].ts - Single Asset CRUD API
import { NextApiResponse } from 'next';
import { withRBAC, AuthenticatedRequest } from '@/lib/supabase-middleware';
import { getServiceSupabase, logAuditTrail } from '@/lib/supabase';

/**
 * GET /api/supabase/assets/[id] - Get single asset
 * PUT /api/supabase/assets/[id] - Update asset
 * DELETE /api/supabase/assets/[id] - Delete asset
 */
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const supabase = getServiceSupabase();
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid asset ID' });
  }

  try {
    // GET - Fetch single asset
    if (req.method === 'GET') {
      const { data: asset, error } = await supabase
        .from('assets')
        .select('*, locations(name)')
        .eq('id', id)
        .single();

      if (error || !asset) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      // Get recent inspections for this asset
      const { data: inspections } = await supabase
        .from('v_inspections_detailed')
        .select('*')
        .eq('asset_id', id)
        .order('inspection_date', { ascending: false })
        .limit(5);

      return res.status(200).json({
        success: true,
        data: {
          ...(asset as any),
          recent_inspections: inspections || [],
        },
      });
    }

    // PUT - Update asset
    if (req.method === 'PUT') {
      const updates = req.body;

      // Fetch existing asset
      const { data: existing, error: fetchError } = await supabase
        .from('assets')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !existing) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      // Check if serial number is being changed to an existing one
      if (updates.serial_number && updates.serial_number !== (existing as any).serial_number) {
        const { data: duplicate } = await supabase
          .from('assets')
          .select('id')
          .eq('serial_number', updates.serial_number)
          .single();

        if (duplicate) {
          return res
            .status(409)
            .json({ error: 'Asset with this serial number already exists' });
        }
      }

      // Update asset
      const { data: updated, error: updateError } = await (supabase
        .from('assets') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating asset:', updateError);
        return res.status(500).json({ error: 'Failed to update asset' });
      }

      // Log audit trail
      await logAuditTrail({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'UPDATE',
        entityType: 'asset',
        entityId: id,
        description: `Updated asset: ${(updated as any).serial_number}`,
        oldValues: existing,
        newValues: updated,
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestMethod: req.method!,
        requestPath: req.url || '',
        severity: 'info',
      });

      return res.status(200).json({
        success: true,
        data: updated,
      });
    }

    // DELETE - Delete asset (soft delete)
    if (req.method === 'DELETE') {
      // Only admins can delete assets
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden - Only admins can delete assets' });
      }

      // Check if asset exists
      const { data: existing, error: fetchError } = await supabase
        .from('assets')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !existing) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      // Soft delete - set is_active to false
      const { error: deleteError } = await (supabase
        .from('assets') as any)
        .update({ is_active: false })
        .eq('id', id);

      if (deleteError) {
        console.error('Error deleting asset:', deleteError);
        return res.status(500).json({ error: 'Failed to delete asset' });
      }

      // Log audit trail
      await logAuditTrail({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'DELETE',
        entityType: 'asset',
        entityId: id,
        description: `Deleted asset: ${(existing as any).serial_number}`,
        oldValues: existing,
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestMethod: req.method!,
        requestPath: req.url || '',
        severity: 'warning',
      });

      return res.status(200).json({
        success: true,
        message: 'Asset deleted successfully',
      });
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Asset API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Export with RBAC middleware
export default withRBAC(handler, {
  requiredRole: ['admin', 'supervisor', 'inspector'],
});
