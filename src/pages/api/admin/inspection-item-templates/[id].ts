// src/pages/api/admin/inspection-item-templates/[id].ts
// API for updating and deleting inspection item templates
import { NextApiResponse } from 'next';
import { withRBAC, AuthenticatedRequest } from '@/lib/supabase-middleware';
import { getServiceSupabase, logAuditTrail } from '@/lib/supabase';

/**
 * PUT /api/admin/inspection-item-templates/[id] - Update template
 * DELETE /api/admin/inspection-item-templates/[id] - Delete template
 */
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const supabase = getServiceSupabase();
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Template ID is required' });
  }

  try {
    // PUT - Update template
    if (req.method === 'PUT') {
      const {
        item_no,
        serial_no,
        location,
        type_size,
        item_id,
        item_name,
        kit_no,
        model,
        model_no,
        kit_location,
        display_order,
        is_active,
        metadata,
      } = req.body;

      // Get existing template to log changes
      const { data: existingTemplate, error: fetchError } = await supabase
        .from('inspection_item_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !existingTemplate) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Build update data
      const updateData: any = {};

      if (item_no !== undefined) updateData.item_no = item_no;
      if (serial_no !== undefined) updateData.serial_no = serial_no;
      if (location !== undefined) updateData.location = location;
      if (type_size !== undefined) updateData.type_size = type_size;
      if (item_id !== undefined) updateData.item_id = item_id;
      if (item_name !== undefined) updateData.item_name = item_name;
      if (kit_no !== undefined) updateData.kit_no = kit_no;
      if (model !== undefined) updateData.model = model;
      if (model_no !== undefined) updateData.model_no = model_no;
      if (kit_location !== undefined) updateData.kit_location = kit_location;
      if (display_order !== undefined) updateData.display_order = display_order;
      if (is_active !== undefined) updateData.is_active = is_active;
      if (metadata !== undefined) updateData.metadata = metadata;

      const { data: updatedTemplate, error: updateError } = await supabase
        .from('inspection_item_templates')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating inspection item template:', updateError);
        return res.status(500).json({ error: 'Failed to update template' });
      }

      // Log audit trail
      await logAuditTrail({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'UPDATE',
        entityType: 'inspection_item_template',
        entityId: id,
        description: `Updated ${existingTemplate.item_type} template`,
        oldValues: existingTemplate,
        newValues: updatedTemplate,
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestMethod: req.method!,
        requestPath: req.url || '',
        severity: 'info',
      });

      return res.status(200).json({
        success: true,
        data: updatedTemplate,
      });
    }

    // DELETE - Delete template
    if (req.method === 'DELETE') {
      // Get existing template to log deletion
      const { data: existingTemplate, error: fetchError } = await supabase
        .from('inspection_item_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !existingTemplate) {
        return res.status(404).json({ error: 'Template not found' });
      }

      const { error: deleteError } = await supabase
        .from('inspection_item_templates')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Error deleting inspection item template:', deleteError);
        return res.status(500).json({ error: 'Failed to delete template' });
      }

      // Log audit trail
      await logAuditTrail({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'DELETE',
        entityType: 'inspection_item_template',
        entityId: id,
        description: `Deleted ${existingTemplate.item_type} template`,
        oldValues: existingTemplate,
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestMethod: req.method!,
        requestPath: req.url || '',
        severity: 'info',
      });

      return res.status(200).json({
        success: true,
        message: 'Template deleted successfully',
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Inspection item templates API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// For PUT/DELETE requests, require can_manage_forms (only admins can modify)
async function handlerWithMethodCheck(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'PUT' || req.method === 'DELETE') {
    if (!req.user?.permissions.canManageForms) {
      return res.status(403).json({
        error: 'Forbidden - Insufficient permissions',
        required: 'can_manage_forms',
      });
    }
  }
  return handler(req, res);
}

export default withRBAC(handlerWithMethodCheck, {
  requiredPermission: ['can_manage_forms', 'can_view_inspections'],
  requireAll: false,
});
