// src/pages/api/inspections/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { withRBAC } from '@/lib/rbac';
import { User } from '@/hooks/useAuth';
import { getServiceSupabase, logAuditTrail } from '@/lib/supabase';
import { InspectionType, InspectionStatus } from '@/types/database';

// Increase body size limit for this endpoint to handle images
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

export interface InspectionSubmission {
  id: string;
  formType: string;
  formTemplateId: string;
  inspectorId: string;
  inspectorName: string;
  data: Record<string, any>;
  signature?: {
    dataUrl: string;
    timestamp: string;
    inspectorId: string;
    inspectorName: string;
  };
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Auto-assign inspection to an available supervisor
 * Uses round-robin or load-balanced assignment
 */
async function assignToSupervisor(supabase: any): Promise<string | null> {
  try {
    // Get all active supervisors with review permissions
    const { data: supervisors, error: supervisorError } = await supabase
      .from('users')
      .select('id, name')
      .eq('role', 'supervisor')
      .eq('is_active', true);

    if (supervisorError || !supervisors || supervisors.length === 0) {
      console.warn('No active supervisors found for assignment');
      return null;
    }

    // If only one supervisor, assign to them
    if (supervisors.length === 1) {
      return supervisors[0].id;
    }

    // Get pending inspection counts for each supervisor (load balancing)
    const supervisorLoads = await Promise.all(
      supervisors.map(async (supervisor: any) => {
        const { count } = await supabase
          .from('inspections')
          .select('*', { count: 'exact', head: true })
          .eq('reviewer_id', supervisor.id)
          .eq('status', 'pending_review');

        return {
          id: supervisor.id,
          name: supervisor.name,
          pendingCount: count || 0,
        };
      }),
    );

    // Assign to supervisor with least pending inspections
    supervisorLoads.sort((a, b) => a.pendingCount - b.pendingCount);
    const assignedSupervisor = supervisorLoads[0];

    console.log(
      `Auto-assigned to supervisor: ${assignedSupervisor.name} (${assignedSupervisor.pendingCount} pending)`,
    );
    return assignedSupervisor.id;
  } catch (error) {
    console.error('Error assigning supervisor:', error);
    return null;
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse, user: User) {
  if (req.method === 'GET') {
    return getInspections(req, res, user);
  }
  if (req.method === 'POST') {
    return createInspection(req, res, user);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

// GET /api/inspections
async function getInspections(req: NextApiRequest, res: NextApiResponse, user: User) {
  const { formType, status, startDate, endDate, page = '1', limit = '20' } = req.query;

  try {
    const supabase = getServiceSupabase();
    let query = supabase.from('inspections').select('*', { count: 'exact' });

    // Filter by inspector if not admin/supervisor
    if (user.role === 'inspector') {
      query = query.eq('inspector_id', user.id);
    }

    // Filter by formType if specified, otherwise return all inspection types
    if (formType && typeof formType === 'string') {
      query = query.eq('inspection_type', formType as InspectionType);
    }
    // No else clause - return all inspection types when formType is not specified

    // Filter by status
    if (status && typeof status === 'string') {
      query = query.eq('status', status as InspectionStatus);
    }

    // Filter by date range
    if (startDate && typeof startDate === 'string') {
      query = query.gte('created_at', startDate);
    }
    if (endDate && typeof endDate === 'string') {
      query = query.lte('created_at', endDate);
    }

    // Sort by creation date (newest first)
    query = query.order('created_at', { ascending: false });

    // Pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const startIndex = (pageNum - 1) * limitNum;
    query = query.range(startIndex, startIndex + limitNum - 1);

    const { data: inspections, error, count } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({ error: 'Failed to fetch inspections' });
    }

    return res.status(200).json({
      inspections: inspections || [],
      total: count || 0,
      page: pageNum,
      totalPages: Math.ceil((count || 0) / limitNum),
    });
  } catch (error) {
    console.error('Get inspections error:', error);
    return res.status(500).json({ error: 'Failed to fetch inspections' });
  }
}

// POST /api/inspections
async function createInspection(req: NextApiRequest, res: NextApiResponse, user: User) {
  const {
    id,
    formType,
    formTemplateId,
    data,
    signature,
    status = 'draft',
    locationId,
    assetId,
    inspectorId,
    inspectorName,
  } = req.body;

  try {
    if (!formType || !data) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['formType', 'data'],
      });
    }

    const supabase = getServiceSupabase();
    const now = new Date().toISOString();

    // Map status from old format to new format
    let inspectionStatus: InspectionStatus = 'draft';
    if (status === 'submitted' || status === 'pending_review') {
      inspectionStatus = 'pending_review';
    } else if (status === 'approved') {
      inspectionStatus = 'approved';
    } else if (status === 'rejected') {
      inspectionStatus = 'rejected';
    } else if (status === 'completed') {
      inspectionStatus = 'completed';
    }

    // Auto-assign to a supervisor if status is pending_review
    let assignedSupervisorId = null;
    if (inspectionStatus === 'pending_review') {
      assignedSupervisorId = await assignToSupervisor(supabase);
    }

    // Use provided inspector info (for localStorage migration) or current user
    const actualInspectorId = inspectorId || user.id;
    const actualInspectorName = inspectorName || data.inspectedBy || user.name;

    const inspectionData: any = {
      inspection_type: formType as InspectionType,
      inspector_id: actualInspectorId,
      inspected_by: actualInspectorName,
      designation: data.designation || user.role || null,
      location_id: locationId || null,
      asset_id: assetId || null,
      form_template_id: formTemplateId || null,
      form_data: data,
      signature: signature?.dataUrl || null,
      status: inspectionStatus,
      submitted_at: inspectionStatus === 'pending_review' ? now : null,
      inspection_date: data.inspectionDate || data.date || new Date().toISOString().split('T')[0],
      remarks: data.remarks || null,
      reviewer_id: assignedSupervisorId,
    };

    // Include custom ID if provided (for localStorage migration)
    if (id) {
      inspectionData.id = id;
    }

    const { data: newInspection, error } = await (supabase.from('inspections') as any)
      .insert(inspectionData)
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to create inspection', details: error.message });
    }

    // Log inspection creation
    await logAuditTrail({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'CREATE',
      entityType: 'inspection',
      entityId: newInspection.id,
      description: `Created ${formType} inspection`,
      newValues: inspectionData,
    });

    return res.status(201).json({
      inspection: newInspection,
      message: 'Inspection created successfully',
    });
  } catch (error) {
    console.error('Create inspection error:', error);
    return res.status(500).json({ error: 'Failed to create inspection' });
  }
}

export default withRBAC(handler, {
  requiredPermission: 'canViewInspections',
});
