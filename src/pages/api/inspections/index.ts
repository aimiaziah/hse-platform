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

    // [NEW] Automatically export to SharePoint if status is pending_review
    // This MUST complete before response is sent to ensure export happens
    if (inspectionStatus === 'pending_review') {
      try {
        console.log(`[SharePoint] Starting export for inspection ${newInspection.id}...`);

        // Import SharePoint functions
        const { generateInspectionExcel } = await import('@/utils/inspectionExcelExporter');
        const { uploadInspectionToSharePoint, formatStatusForSharePoint } = await import(
          '@/utils/powerAutomate'
        );

        console.log(`[SharePoint] Generating Excel for ${formType}...`);

        // Generate Excel
        const excelBlob = await generateInspectionExcel(formType as any, data, {
          inspectionNumber: newInspection.inspection_number || 'DRAFT',
          inspectorName: actualInspectorName,
          inspectionDate: newInspection.inspection_date,
          status: formatStatusForSharePoint('pending_review', actualInspectorName),
        });

        console.log(`[SharePoint] Excel generated (${excelBlob.size} bytes), uploading...`);

        // Upload to SharePoint
        const sharePointResult = await uploadInspectionToSharePoint(newInspection, excelBlob);

        console.log(`[SharePoint] Upload successful, updating database...`);

        // Update tracking
        await supabase
          .from('inspections')
          .update({
            sharepoint_file_id: sharePointResult.fileId,
            sharepoint_file_url: sharePointResult.fileUrl,
            sharepoint_exported_at: new Date().toISOString(),
            sharepoint_sync_status: 'synced',
          })
          .eq('id', newInspection.id);

        // Log success
        await supabase.from('sharepoint_sync_log').insert({
          inspection_id: newInspection.id,
          sync_type: 'create',
          status: 'success',
          metadata: { fileId: sharePointResult.fileId, fileUrl: sharePointResult.fileUrl },
        });

        console.log(`✅ [SharePoint] Export complete: ${sharePointResult.fileUrl}`);
      } catch (exportError: any) {
        // Don't fail inspection creation - just log error
        console.error(
          `❌ [SharePoint] Export failed for inspection ${newInspection.id}:`,
          exportError,
        );
        console.error(`[SharePoint] Error details:`, {
          message: exportError?.message,
          stack: exportError?.stack,
          cause: exportError?.cause,
        });

        try {
          await supabase
            .from('inspections')
            .update({ sharepoint_sync_status: 'failed' })
            .eq('id', newInspection.id);

          await supabase.from('sharepoint_sync_log').insert({
            inspection_id: newInspection.id,
            sync_type: 'create',
            status: 'failure',
            error_message: exportError?.message || 'Unknown error',
            metadata: {
              error: exportError?.message,
              stack: exportError?.stack?.substring(0, 500), // Limit stack trace length
            },
          });
        } catch (logError) {
          console.error(`[SharePoint] Failed to log error:`, logError);
        }
      }
    }

    // Send push notification to assigned supervisor (if status is pending_review)
    if (inspectionStatus === 'pending_review' && assignedSupervisorId) {
      try {
        // Get supervisor details
        const { data: supervisor } = await supabase
          .from('users')
          .select('name')
          .eq('id', assignedSupervisorId)
          .single();

        // Send notification (fire and forget - don't wait for it)
        fetch(
          `${
            process.env.NEXT_PUBLIC_BASE_URL ||
            'https://hse-platform-j2zac.ondigitalocean.app/login'
          }/api/notifications/send`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // Forward auth token from original request
              Cookie: req.headers.cookie || '',
            },
            body: JSON.stringify({
              userId: assignedSupervisorId,
              notificationType: 'inspection_assigned',
              title: 'New Inspection Assigned',
              body: `${actualInspectorName} submitted a ${formatInspectionType(
                formType,
              )} inspection for your review.`,
              data: {
                inspectionId: newInspection.id,
                inspectionType: formType,
                inspectorName: actualInspectorName,
                url: `/supervisor/review/${newInspection.id}`,
              },
              inspectionId: newInspection.id,
            }),
          },
        ).catch((err) => {
          console.error('Failed to send push notification:', err);
          // Don't fail the inspection creation if notification fails
        });

        console.log(
          `📬 Notification queued for supervisor: ${supervisor?.name || assignedSupervisorId}`,
        );
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
        // Don't fail the inspection creation if notification fails
      }
    }

    return res.status(201).json({
      inspection: newInspection,
      message: 'Inspection created successfully',
    });
  } catch (error) {
    console.error('Create inspection error:', error);
    return res.status(500).json({ error: 'Failed to create inspection' });
  }
}

/**
 * Format inspection type for display
 */
function formatInspectionType(type: string): string {
  const typeMap: Record<string, string> = {
    fire_extinguisher: 'Fire Extinguisher',
    first_aid: 'First Aid',
    hse_general: 'HSE General',
    manhours: 'Man-hours Report',
  };
  return typeMap[type] || type;
}

export default withRBAC(handler, {
  requiredPermission: 'canViewInspections',
});
