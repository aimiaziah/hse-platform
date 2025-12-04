// src/pages/api/supabase/inspections/[id].ts - Single Inspection CRUD API
import { NextApiResponse } from 'next';
import { withRBAC, AuthenticatedRequest } from '@/lib/supabase-middleware';
import { getServiceSupabase, logAuditTrail, createNotification } from '@/lib/supabase';

/**
 * GET /api/supabase/inspections/[id] - Get single inspection
 * PUT /api/supabase/inspections/[id] - Update inspection
 * DELETE /api/supabase/inspections/[id] - Delete inspection
 */
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const supabase = getServiceSupabase();
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid inspection ID' });
  }

  try {
    // GET - Fetch single inspection
    if (req.method === 'GET') {
      const { data: inspection, error } = await supabase
        .from('v_inspections_detailed')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching inspection:', error);
        return res.status(404).json({ error: 'Inspection not found' });
      }

      // Check permissions - inspectors can only view their own
      if (
        req.user?.role === 'inspector' &&
        (inspection as any).inspector_id !== req.user.id
      ) {
        return res.status(403).json({ error: 'Forbidden - Cannot view this inspection' });
      }

      // Fetch inspection items
      const { data: items } = await supabase
        .from('inspection_items')
        .select('*')
        .eq('inspection_id', id)
        .order('item_number');

      return res.status(200).json({
        success: true,
        data: {
          ...(inspection as any),
          items: items || [],
        },
      });
    }

    // PUT - Update inspection
    if (req.method === 'PUT') {
      const updates = req.body;

      // Fetch existing inspection
      const { data: existing, error: fetchError } = await supabase
        .from('inspections')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !existing) {
        return res.status(404).json({ error: 'Inspection not found' });
      }

      // Check permissions
      if (req.user?.role === 'inspector') {
        // Inspectors can only edit their own draft inspections
        if ((existing as any).inspector_id !== req.user.id) {
          return res.status(403).json({ error: 'Forbidden - Cannot edit this inspection' });
        }
        if ((existing as any).status !== 'draft') {
          return res.status(403).json({ error: 'Cannot edit submitted inspection' });
        }
      }

      // Supervisors can update status and review comments
      if (req.user?.role === 'supervisor' && updates.status) {
        updates.reviewer_id = req.user.id;
        updates.reviewed_at = new Date().toISOString();
      }

      // Update inspection
      const { data: updated, error: updateError } = await (supabase
        .from('inspections') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating inspection:', updateError);
        return res.status(500).json({ error: 'Failed to update inspection' });
      }

      // Log audit trail
      await logAuditTrail({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'UPDATE',
        entityType: 'inspection',
        entityId: id,
        description: `Updated inspection status to ${updates.status || 'draft'}`,
        oldValues: existing,
        newValues: updated,
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestMethod: req.method!,
        requestPath: req.url || '',
        severity: 'info',
      });

      // Notify inspector if inspection was approved/rejected
      if (updates.status === 'approved' || updates.status === 'rejected') {
        await createNotification({
          userId: (existing as any).inspector_id,
          title: `Inspection ${updates.status === 'approved' ? 'Approved' : 'Rejected'}`,
          message: `Your ${(existing as any).inspection_type} inspection has been ${updates.status} by ${req.user!.name}`,
          type: updates.status === 'approved' ? 'success' : 'warning',
          relatedEntityType: 'inspection',
          relatedEntityId: id,
        });
      }

      return res.status(200).json({
        success: true,
        data: updated,
      });
    }

    // DELETE - Delete inspection
    if (req.method === 'DELETE') {
      // Fetch existing inspection
      const { data: existing, error: fetchError } = await supabase
        .from('inspections')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !existing) {
        return res.status(404).json({ error: 'Inspection not found' });
      }

      // Only inspectors can delete their own draft inspections
      // Or admins can delete any inspection
      if (req.user?.role === 'inspector') {
        if ((existing as any).inspector_id !== req.user.id || (existing as any).status !== 'draft') {
          return res.status(403).json({ error: 'Forbidden - Cannot delete this inspection' });
        }
      } else if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
      }

      // Delete inspection (cascade will delete items)
      const { error: deleteError } = await supabase.from('inspections').delete().eq('id', id);

      if (deleteError) {
        console.error('Error deleting inspection:', deleteError);
        return res.status(500).json({ error: 'Failed to delete inspection' });
      }

      // Log audit trail
      await logAuditTrail({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'DELETE',
        entityType: 'inspection',
        entityId: id,
        description: `Deleted inspection`,
        oldValues: existing,
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestMethod: req.method!,
        requestPath: req.url || '',
        severity: 'warning',
      });

      return res.status(200).json({
        success: true,
        message: 'Inspection deleted successfully',
      });
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Inspection API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Export with RBAC middleware
export default withRBAC(handler, {
  requiredPermission: ['can_view_inspections'],
});
