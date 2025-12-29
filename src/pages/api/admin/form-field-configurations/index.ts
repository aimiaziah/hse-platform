// src/pages/api/admin/form-field-configurations/index.ts
// API for managing form field configurations
import { NextApiResponse } from 'next';
import { withRBAC, AuthenticatedRequest } from '@/lib/supabase-middleware';
import { getServiceSupabase, logAuditTrail } from '@/lib/supabase';

/**
 * GET /api/admin/form-field-configurations - Get all field configurations
 * POST /api/admin/form-field-configurations - Create new field configuration
 */
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const supabase = getServiceSupabase() as any;

  try {
    // GET - Fetch configurations
    if (req.method === 'GET') {
      const { form_type, is_active } = req.query;

      let query = supabase
        .from('form_field_configurations')
        .select('*')
        .order('display_order', { ascending: true });

      if (form_type) {
        query = query.eq('form_type', form_type);
      }
      if (is_active !== undefined) {
        query = query.eq('is_active', is_active === 'true');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching form field configurations:', error);
        return res.status(500).json({ error: 'Failed to fetch configurations' });
      }

      return res.status(200).json({
        success: true,
        data: data || [],
      });
    }

    // POST - Create new field configuration
    if (req.method === 'POST') {
      const {
        form_type,
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

      // Validate required fields
      if (!form_type || !field_key || !field_label || !field_type) {
        return res.status(400).json({
          error: 'form_type, field_key, field_label, and field_type are required',
        });
      }

      // Validate form_type
      if (!['fire_extinguisher', 'first_aid'].includes(form_type)) {
        return res.status(400).json({ error: 'Invalid form_type' });
      }

      // Validate field_type
      if (!['text', 'number', 'rating', 'date', 'textarea', 'select'].includes(field_type)) {
        return res.status(400).json({ error: 'Invalid field_type' });
      }

      // Deactivate existing field with same key if creating new active one
      if (is_active !== false) {
        (await supabase
          .from('form_field_configurations')
          .update({ is_active: false } as any)
          .eq('form_type', form_type)
          .eq('field_key', field_key)
          .eq('is_active', true)) as { error: any };
      }

      const insertData: any = {
        form_type,
        field_key,
        field_label,
        field_type,
        display_order: display_order || 0,
        is_visible: is_visible !== undefined ? is_visible : true,
        is_required: is_required !== undefined ? is_required : false,
        is_active: is_active !== undefined ? is_active : true,
        created_by: req.user!.id,
      };

      if (column_width !== undefined) insertData.column_width = column_width;
      if (min_width !== undefined) insertData.min_width = min_width;
      if (default_value !== undefined) insertData.default_value = default_value;
      if (placeholder !== undefined) insertData.placeholder = placeholder;
      if (help_text !== undefined) insertData.help_text = help_text;
      if (validation_rules !== undefined) insertData.validation_rules = validation_rules;

      const { data: config, error: createError } = (await supabase
        .from('form_field_configurations')
        .insert(insertData)
        .select()
        .single()) as { data: any; error: any };

      if (createError) {
        console.error('Error creating form field configuration:', createError);
        return res.status(500).json({ error: 'Failed to create configuration' });
      }

      // Log audit trail
      await logAuditTrail({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'CREATE',
        entityType: 'form_field_configuration',
        entityId: config.id,
        description: `Created field configuration: ${field_label} for ${form_type}`,
        newValues: config,
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestMethod: req.method!,
        requestPath: req.url || '',
        severity: 'info',
      });

      return res.status(201).json({
        success: true,
        data: config,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Form field configurations API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Allow GET for inspectors, require can_manage_forms for POST
async function handlerWithMethodCheck(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    if (!req.user?.permissions.canViewInspections && !req.user?.permissions.canManageForms) {
      return res.status(403).json({
        error: 'Forbidden - Insufficient permissions',
        required: 'can_view_inspections or can_manage_forms',
      });
    }
    return handler(req, res);
  }

  if (req.method === 'POST') {
    if (!req.user?.permissions.canManageForms) {
      return res.status(403).json({
        error: 'Forbidden - Insufficient permissions',
        required: 'can_manage_forms',
      });
    }
    return handler(req, res);
  }

  return handler(req, res);
}

export default withRBAC(handlerWithMethodCheck, {
  requiredPermission: ['can_manage_forms', 'can_view_inspections'],
  requireAll: false,
});
