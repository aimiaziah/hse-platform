// src/pages/api/supabase/locations/[id].ts - Single Location CRUD API
import { NextApiResponse } from 'next';
import { withRBAC, AuthenticatedRequest } from '@/lib/supabase-middleware';
import { getServiceSupabase, logAuditTrail } from '@/lib/supabase';

/**
 * GET /api/supabase/locations/[id] - Get single location
 * PUT /api/supabase/locations/[id] - Update location
 * DELETE /api/supabase/locations/[id] - Delete location
 */
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const supabase = getServiceSupabase();
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid location ID' });
  }

  try {
    // GET - Fetch single location
    if (req.method === 'GET') {
      const { data: location, error } = await supabase
        .from('locations')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !location) {
        return res.status(404).json({ error: 'Location not found' });
      }

      return res.status(200).json({
        success: true,
        data: location,
      });
    }

    // PUT - Update location
    if (req.method === 'PUT') {
      const updates = req.body;

      // Fetch existing location
      const { data: existing, error: fetchError } = await supabase
        .from('locations')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !existing) {
        return res.status(404).json({ error: 'Location not found' });
      }

      // Check if name is being changed to an existing name
      if (updates.name && updates.name !== (existing as any).name) {
        const { data: duplicate } = await supabase
          .from('locations')
          .select('id')
          .eq('name', updates.name)
          .single();

        if (duplicate) {
          return res.status(409).json({ error: 'Location with this name already exists' });
        }
      }

      // Update location
      const { data: updated, error: updateError } = await (supabase
        .from('locations') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating location:', updateError);
        return res.status(500).json({ error: 'Failed to update location' });
      }

      // Log audit trail
      await logAuditTrail({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'UPDATE',
        entityType: 'location',
        entityId: id,
        description: `Updated location: ${(updated as any).name}`,
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

    // DELETE - Delete location (soft delete - set is_active to false)
    if (req.method === 'DELETE') {
      // Check if location exists
      const { data: existing, error: fetchError } = await supabase
        .from('locations')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !existing) {
        return res.status(404).json({ error: 'Location not found' });
      }

      // Soft delete - set is_active to false
      const { error: deleteError } = await (supabase
        .from('locations') as any)
        .update({ is_active: false })
        .eq('id', id);

      if (deleteError) {
        console.error('Error deleting location:', deleteError);
        return res.status(500).json({ error: 'Failed to delete location' });
      }

      // Log audit trail
      await logAuditTrail({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'DELETE',
        entityType: 'location',
        entityId: id,
        description: `Deleted location: ${(existing as any).name}`,
        oldValues: existing,
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestMethod: req.method!,
        requestPath: req.url || '',
        severity: 'warning',
      });

      return res.status(200).json({
        success: true,
        message: 'Location deleted successfully',
      });
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Location API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Export with RBAC middleware - admins and supervisors can manage locations
export default withRBAC(handler, {
  requiredRole: ['admin', 'supervisor'],
});
