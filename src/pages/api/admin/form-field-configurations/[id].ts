// src/pages/api/admin/form-field-configurations/[id].ts
// API for updating and deleting form field configurations
import { NextApiResponse } from 'next';
import { withRBAC, AuthenticatedRequest } from '@/lib/supabase-middleware';
import { getServiceSupabase, logAuditTrail } from '@/lib/supabase';

/**
 * PUT /api/admin/form-field-configurations/[id] - Update configuration
 * DELETE /api/admin/form-field-configurations/[id] - Delete configuration
 */
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const supabase = getServiceSupabase() as any;
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Configuration ID is required' });
  }

  try {
    // PUT - Update configuration
    if (req.method === 'PUT') {
      const {
        field_key,
        field_label,
        field_type,
        display_order,
        is_visible,
        is_required,
        column_width,
        min_width,
        default_value,
        placeholder,
        help_text,
        validation_rules,
        is_active,
      } = req.body;

      // Get existing configuration to log changes
      const { data: existingConfig, error: fetchError } = (await supabase
        .from('form_field_configurations')
        .select('*')
        .eq('id', id)
        .single()) as { data: any; error: any };

      if (fetchError || !existingConfig) {
        return res.status(404).json({ error: 'Configuration not found' });
      }

      // Build update data
      const updateData: any = {};

      if (field_key !== undefined) updateData.field_key = field_key;
      if (field_label !== undefined) updateData.field_label = field_label;
      if (field_type !== undefined) updateData.field_type = field_type;
      if (display_order !== undefined) updateData.display_order = display_order;
      if (is_visible !== undefined) updateData.is_visible = is_visible;
      if (is_required !== undefined) updateData.is_required = is_required;
      if (column_width !== undefined) updateData.column_width = column_width;
      if (min_width !== undefined) updateData.min_width = min_width;
      if (default_value !== undefined) updateData.default_value = default_value;
      if (placeholder !== undefined) updateData.placeholder = placeholder;
      if (help_text !== undefined) updateData.help_text = help_text;
      if (validation_rules !== undefined) updateData.validation_rules = validation_rules;
      if (is_active !== undefined) updateData.is_active = is_active;

      const { data: updatedConfig, error: updateError } = (await supabase
        .from('form_field_configurations')
        .update(updateData as any)
        .eq('id', id)
        .select()
        .single()) as { data: any; error: any };

      if (updateError) {
        console.error('Error updating form field configuration:', updateError);
        return res.status(500).json({ error: 'Failed to update configuration' });
      }

      // Log audit trail
      await logAuditTrail({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'UPDATE',
        entityType: 'form_field_configuration',
        entityId: id,
        description: `Updated field configuration: ${field_label || existingConfig.field_label}`,
        oldValues: existingConfig,
        newValues: updatedConfig,
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestMethod: req.method!,
        requestPath: req.url || '',
        severity: 'info',
      });

      return res.status(200).json({
        success: true,
        data: updatedConfig,
      });
    }

    // DELETE - Delete configuration (actually deactivate)
    if (req.method === 'DELETE') {
      // Get existing configuration to log deletion
      const { data: existingConfig, error: fetchError } = (await supabase
        .from('form_field_configurations')
        .select('*')
        .eq('id', id)
        .single()) as { data: any; error: any };

      if (fetchError || !existingConfig) {
        return res.status(404).json({ error: 'Configuration not found' });
      }

      // Instead of deleting, deactivate it
      const { error: deactivateError } = (await supabase
        .from('form_field_configurations')
        .update({ is_active: false } as any)
        .eq('id', id)) as { error: any };

      if (deactivateError) {
        console.error('Error deactivating form field configuration:', deactivateError);
        return res.status(500).json({ error: 'Failed to deactivate configuration' });
      }

      // Log audit trail
      await logAuditTrail({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'DELETE',
        entityType: 'form_field_configuration',
        entityId: id,
        description: `Deactivated field configuration: ${existingConfig.field_label}`,
        oldValues: existingConfig,
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestMethod: req.method!,
        requestPath: req.url || '',
        severity: 'info',
      });

      return res.status(200).json({
        success: true,
        message: 'Configuration deactivated successfully',
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Form field configurations API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Require can_manage_forms for PUT/DELETE
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
