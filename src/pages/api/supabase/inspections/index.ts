// src/pages/api/supabase/inspections/index.ts - Inspections CRUD API
import { NextApiResponse } from 'next';
import { withRBAC, AuthenticatedRequest } from '@/lib/supabase-middleware';
import { getServiceSupabase, logAuditTrail, createNotification } from '@/lib/supabase';
import {
  validateBody,
  validateQuery,
  InspectionCreateSchema,
  ListQuerySchema,
} from '@/lib/validation';
import { logger } from '@/lib/logger';

/**
 * GET /api/supabase/inspections - List inspections
 * POST /api/supabase/inspections - Create new inspection
 */
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const supabase = getServiceSupabase();

  try {
    // GET - List inspections
    if (req.method === 'GET') {
      // Validate query parameters
      const queryValidation = validateQuery(ListQuerySchema, req.query);
      if (!queryValidation.success) {
        logger.warn('Invalid query parameters for inspections list', {
          errors: queryValidation.details,
        });
        return res.status(400).json(queryValidation);
      }

      const { status, inspection_type, inspector_id, limit, offset } = queryValidation.data;

      let query = supabase.from('v_inspections_detailed').select('*');

      // Apply filters based on user role
      if (req.user?.role === 'inspector') {
        // Inspectors can only see their own inspections
        query = query.eq('inspector_id', req.user.id);
      }

      // Apply query filters
      if (status) {
        query = query.eq('status', status);
      }
      if (inspection_type) {
        query = query.eq('inspection_type', inspection_type);
      }
      if (inspector_id && (req.user?.role === 'admin' || req.user?.role === 'supervisor')) {
        query = query.eq('inspector_id', inspector_id);
      }

      // Apply pagination (validated types are numbers)
      const limitNum = (limit as number) || 50;
      const offsetNum = (offset as number) || 0;
      query = query
        .order('created_at', { ascending: false })
        .range(offsetNum, offsetNum + limitNum - 1);

      const { data, error, count } = await query;

      if (error) {
        logger.error('Error fetching inspections', error);
        return res.status(500).json({ error: 'Failed to fetch inspections' });
      }

      return res.status(200).json({
        success: true,
        data,
        pagination: {
          total: count || data?.length || 0,
          limit: limitNum,
          offset: offsetNum,
        },
      });
    }

    // POST - Create new inspection
    if (req.method === 'POST') {
      // Validate request body
      const validation = validateBody(InspectionCreateSchema, req.body);
      if (!validation.success) {
        logger.warn('Inspection creation validation failed', {
          errors: validation.details,
          userId: req.user?.id,
        });
        return res.status(400).json(validation);
      }

      const inspectionData = validation.data;

      // Create inspection
      const { data: inspection, error: createError } = await (supabase.from('inspections') as any)
        .insert({
          inspection_type: inspectionData.inspection_type,
          inspector_id: req.user!.id,
          inspected_by: req.user!.name,
          designation: req.user!.role,
          department: (req.user as any).department || null,
          asset_id: inspectionData.asset_id || null,
          location_id: inspectionData.location_id || null,
          inspection_date: inspectionData.inspection_date || new Date().toISOString().split('T')[0],
          status: inspectionData.status || 'draft',
          form_data: inspectionData.form_data,
          remarks: inspectionData.remarks || null,
          signature: inspectionData.signature || null,
        })
        .select()
        .single();

      if (createError) {
        logger.error('Error creating inspection', createError, { userId: req.user!.id });
        return res.status(500).json({ error: 'Failed to create inspection' });
      }

      logger.info('Inspection created', {
        inspectionId: inspection.id,
        type: (inspection as any).inspection_type,
        userId: req.user!.id,
      });

      // If inspection has items, create them
      if (inspectionData.items && Array.isArray(inspectionData.items)) {
        const items = inspectionData.items.map((item: any, index: number) => ({
          inspection_id: inspection.id,
          item_number: index + 1,
          label: item.label,
          answer: item.answer || null,
          notes: item.notes || null,
        }));

        const { error: itemsError } = await (supabase.from('inspection_items') as any).insert(
          items,
        );

        if (itemsError) {
          logger.error('Error creating inspection items', itemsError, {
            inspectionId: inspection.id,
          });
        }
      }

      // Update asset's last inspection date
      if ((inspection as any).asset_id) {
        await (supabase.from('assets') as any)
          .update({ last_inspection_date: (inspection as any).inspection_date })
          .eq('id', (inspection as any).asset_id);
      }

      // Log audit trail
      await logAuditTrail({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'CREATE',
        entityType: 'inspection',
        entityId: (inspection as any).id,
        description: `Created new ${(inspection as any).inspection_type} inspection`,
        newValues: inspection,
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestMethod: req.method!,
        requestPath: req.url || '',
        severity: 'info',
      });

      // If submitted for review, notify supervisors
      if ((inspection as any).status === 'pending_review') {
        // Get all supervisors
        const { data: supervisors } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'supervisor')
          .eq('is_active', true);

        if (supervisors) {
          for (const supervisor of supervisors) {
            await createNotification({
              userId: (supervisor as any).id,
              title: 'New Inspection for Review',
              message: `${req.user!.name} submitted a ${
                (inspection as any).inspection_type
              } inspection for review`,
              type: 'info',
              relatedEntityType: 'inspection',
              relatedEntityId: (inspection as any).id,
            });
          }
        }
      }

      return res.status(201).json({
        success: true,
        data: inspection,
      });
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    logger.error('Inspections API error', error as Error, { userId: req.user?.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Export with RBAC middleware
export default withRBAC(handler, {
  requiredPermission: ['can_create_inspections', 'can_view_inspections'],
  requireAll: false,
});
