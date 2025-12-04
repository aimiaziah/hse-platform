// src/pages/api/supabase/form-templates/[id].ts - Single Form Template CRUD API
import { NextApiResponse } from 'next';
import { withRBAC, AuthenticatedRequest } from '@/lib/supabase-middleware';
import { getServiceSupabase, logAuditTrail } from '@/lib/supabase';

/**
 * GET /api/supabase/form-templates/[id] - Get single form template
 * PUT /api/supabase/form-templates/[id] - Update form template
 * DELETE /api/supabase/form-templates/[id] - Delete form template
 */
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const supabase = getServiceSupabase();
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid form template ID' });
  }

  try {
    // GET - Fetch single form template
    if (req.method === 'GET') {
      const { data: template, error } = await supabase
        .from('form_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !template) {
        return res.status(404).json({ error: 'Form template not found' });
      }

      return res.status(200).json({
        success: true,
        data: template,
      });
    }

    // PUT - Update form template
    if (req.method === 'PUT') {
      // Only admins can update form templates
      if (!req.user?.permissions.canManageForms) {
        return res.status(403).json({ error: 'Forbidden - Only admins can update form templates' });
      }

      const updates = req.body;

      // Fetch existing template
      const { data: existing, error: fetchError } = await supabase
        .from('form_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !existing) {
        return res.status(404).json({ error: 'Form template not found' });
      }

      // Validate fields if being updated
      if (updates.fields) {
        try {
          if (typeof updates.fields === 'string') {
            updates.fields = JSON.parse(updates.fields);
          }
        } catch (e) {
          return res.status(400).json({ error: 'Invalid JSON in fields' });
        }
      }

      // Update form template
      const { data: updated, error: updateError } = await (supabase.from('form_templates') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating form template:', updateError);
        return res.status(500).json({ error: 'Failed to update form template' });
      }

      // Log audit trail
      await logAuditTrail({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'UPDATE',
        entityType: 'form_template',
        entityId: id,
        description: `Updated form template: ${(updated as any).name}`,
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

    // DELETE - Delete form template (soft delete)
    if (req.method === 'DELETE') {
      // Only admins can delete form templates
      if (!req.user?.permissions.canManageForms) {
        return res.status(403).json({ error: 'Forbidden - Only admins can delete form templates' });
      }

      // Check if template exists
      const { data: existing, error: fetchError } = await supabase
        .from('form_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !existing) {
        return res.status(404).json({ error: 'Form template not found' });
      }

      // Soft delete - set is_active to false
      const { error: deleteError } = await (supabase.from('form_templates') as any)
        .update({ is_active: false })
        .eq('id', id);

      if (deleteError) {
        console.error('Error deleting form template:', deleteError);
        return res.status(500).json({ error: 'Failed to delete form template' });
      }

      // Log audit trail
      await logAuditTrail({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'DELETE',
        entityType: 'form_template',
        entityId: id,
        description: `Deleted form template: ${(existing as any).name}`,
        oldValues: existing,
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestMethod: req.method!,
        requestPath: req.url || '',
        severity: 'warning',
      });

      return res.status(200).json({
        success: true,
        message: 'Form template deleted successfully',
      });
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Form template API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Export with RBAC middleware
export default withRBAC(handler, {
  requiredPermission: ['can_manage_forms', 'can_view_inspections'],
  requireAll: false,
});
