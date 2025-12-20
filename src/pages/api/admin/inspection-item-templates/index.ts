// src/pages/api/admin/inspection-item-templates/index.ts
// API for managing inspection item templates (fire extinguisher and first aid)
import { NextApiResponse } from 'next';
import { withRBAC, AuthenticatedRequest } from '@/lib/supabase-middleware';
import { getServiceSupabase, logAuditTrail } from '@/lib/supabase';

/**
 * GET /api/admin/inspection-item-templates - Get all templates
 * POST /api/admin/inspection-item-templates - Create new template item
 */
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const supabase = getServiceSupabase();

  try {
    // GET - Fetch templates
    if (req.method === 'GET') {
      const { template_type, item_type, is_active } = req.query;

      let query = supabase
        .from('inspection_item_templates')
        .select('*')
        .order('display_order', { ascending: true });

      if (template_type) {
        query = query.eq('template_type', template_type);
      }
      if (item_type) {
        query = query.eq('item_type', item_type);
      }
      if (is_active !== undefined) {
        query = query.eq('is_active', is_active === 'true');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching inspection item templates:', error);
        return res.status(500).json({ error: 'Failed to fetch templates' });
      }

      return res.status(200).json({
        success: true,
        data: data || [],
      });
    }

    // POST - Create new template item
    if (req.method === 'POST') {
      const {
        template_type,
        item_type,
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

      // Validate required fields
      if (!template_type || !item_type) {
        return res.status(400).json({ error: 'template_type and item_type are required' });
      }

      // Validate template_type
      if (!['fire_extinguisher', 'first_aid'].includes(template_type)) {
        return res.status(400).json({ error: 'Invalid template_type' });
      }

      // Validate item_type
      if (!['extinguisher', 'first_aid_item', 'first_aid_kit'].includes(item_type)) {
        return res.status(400).json({ error: 'Invalid item_type' });
      }

      // Build insert data based on item_type
      const insertData: any = {
        template_type,
        item_type,
        display_order: display_order || 0,
        is_active: is_active !== undefined ? is_active : true,
        created_by: req.user!.id,
      };

      if (item_type === 'extinguisher') {
        insertData.item_no = item_no;
        insertData.serial_no = serial_no;
        insertData.location = location;
        insertData.type_size = type_size;
      } else if (item_type === 'first_aid_item') {
        insertData.item_id = item_id;
        insertData.item_name = item_name;
      } else if (item_type === 'first_aid_kit') {
        insertData.kit_no = kit_no;
        insertData.model = model;
        insertData.model_no = model_no;
        insertData.kit_location = kit_location;
      }

      if (metadata) {
        insertData.metadata = metadata;
      }

      const { data: template, error: createError } = await supabase
        .from('inspection_item_templates')
        .insert(insertData)
        .select()
        .single();

      if (createError) {
        console.error('Error creating inspection item template:', createError);
        return res.status(500).json({ error: 'Failed to create template' });
      }

      // Log audit trail
      await logAuditTrail({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'CREATE',
        entityType: 'inspection_item_template',
        entityId: template.id,
        description: `Created ${item_type} template for ${template_type}`,
        newValues: template,
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestMethod: req.method!,
        requestPath: req.url || '',
        severity: 'info',
      });

      return res.status(201).json({
        success: true,
        data: template,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Inspection item templates API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Allow GET requests for anyone with can_view_inspections (inspectors can view templates)
// But require can_manage_forms for POST (only admins can modify)
async function handlerWithMethodCheck(req: AuthenticatedRequest, res: NextApiResponse) {
  // For GET requests, allow anyone with can_view_inspections
  if (req.method === 'GET') {
    if (!req.user?.permissions.canViewInspections && !req.user?.permissions.canManageForms) {
      return res.status(403).json({
        error: 'Forbidden - Insufficient permissions',
        required: 'can_view_inspections or can_manage_forms',
      });
    }
    return handler(req, res);
  }

  // For POST requests, require can_manage_forms
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
