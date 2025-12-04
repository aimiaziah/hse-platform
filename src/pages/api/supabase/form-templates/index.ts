// src/pages/api/supabase/form-templates/index.ts - Form Templates CRUD API
import { NextApiResponse } from 'next';
import { withRBAC, AuthenticatedRequest } from '@/lib/supabase-middleware';
import { getServiceSupabase, logAuditTrail } from '@/lib/supabase';

/**
 * GET /api/supabase/form-templates - List form templates
 * POST /api/supabase/form-templates - Create new form template
 */
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const supabase = getServiceSupabase();

  try {
    // GET - List form templates
    if (req.method === 'GET') {
      const { inspection_type, is_active, limit = '50', offset = '0' } = req.query;

      let query = supabase.from('form_templates').select('*', { count: 'exact' });

      // Apply filters
      if (inspection_type) {
        query = query.eq('inspection_type', inspection_type);
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
        console.error('Error fetching form templates:', error);
        return res.status(500).json({ error: 'Failed to fetch form templates' });
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

    // POST - Create new form template
    if (req.method === 'POST') {
      const { name, inspection_type, description, fields, is_active, version } = req.body;

      // Validate required fields
      if (!name || !inspection_type || !fields) {
        return res
          .status(400)
          .json({ error: 'Name, inspection_type, and fields are required' });
      }

      // Validate inspection type
      const validTypes = ['fire_extinguisher', 'first_aid', 'hse_general'];
      if (!validTypes.includes(inspection_type)) {
        return res.status(400).json({ error: 'Invalid inspection type' });
      }

      // Validate fields is valid JSON
      try {
        if (typeof fields === 'string') {
          JSON.parse(fields);
        }
      } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON in fields' });
      }

      // Create form template
      const { data: template, error: createError } = await (supabase
        .from('form_templates') as any)
        .insert({
          name,
          inspection_type,
          description: description || null,
          fields: typeof fields === 'string' ? JSON.parse(fields) : fields,
          is_active: is_active !== undefined ? is_active : true,
          version: version || 1,
          created_by: req.user!.id,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating form template:', createError);
        return res.status(500).json({ error: 'Failed to create form template' });
      }

      // Log audit trail
      await logAuditTrail({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'CREATE',
        entityType: 'form_template',
        entityId: (template as any).id,
        description: `Created form template: ${name}`,
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

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Form templates API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Export with RBAC middleware - admins can manage form templates, others can view
export default withRBAC(handler, {
  requiredPermission: ['can_manage_forms', 'can_view_inspections'],
  requireAll: false,
});
