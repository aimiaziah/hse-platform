// src/pages/api/manhours/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { withRBAC } from '@/lib/rbac';
import { User } from '@/hooks/useAuth';
import { getServiceSupabase, logAuditTrail } from '@/lib/supabase';

async function handler(req: NextApiRequest, res: NextApiResponse, user: User) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid report ID' });
  }

  if (req.method === 'GET') {
    return getManhoursReport(id, res, user);
  }
  if (req.method === 'PUT') {
    return updateManhoursReport(id, req, res, user);
  }
  if (req.method === 'DELETE') {
    return deleteManhoursReport(id, res, user);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

// GET /api/manhours/[id]
async function getManhoursReport(id: string, res: NextApiResponse, user: User) {
  try {
    const supabase = getServiceSupabase();
    let query = supabase
      .from('inspections')
      .select('*')
      .eq('id', id)
      .eq('inspection_type', 'manhours_report')
      .single();

    const { data: report, error } = await query;

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Report not found' });
      }
      console.error('Supabase query error:', error);
      return res.status(500).json({ error: 'Failed to fetch report' });
    }

    // Check if user has permission to view this report
    if (user.role === 'inspector' && (report as any).inspector_id !== user.id) {
      return res.status(403).json({ error: 'You do not have permission to view this report' });
    }

    return res.status(200).json({ report });
  } catch (error) {
    console.error('Get manhours report error:', error);
    return res.status(500).json({ error: 'Failed to fetch report' });
  }
}

// PUT /api/manhours/[id]
async function updateManhoursReport(id: string, req: NextApiRequest, res: NextApiResponse, user: User) {
  try {
    const reportData = req.body;
    const supabase = getServiceSupabase();

    // First, get the existing report
    const { data: existingReport, error: fetchError } = await supabase
      .from('inspections')
      .select('*')
      .eq('id', id)
      .eq('inspection_type', 'manhours_report')
      .single();

    if (fetchError || !existingReport) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Check if user has permission to update this report
    if (user.role === 'inspector' && (existingReport as any).inspector_id !== user.id) {
      return res.status(403).json({ error: 'You do not have permission to update this report' });
    }

    const now = new Date().toISOString();
    const inspectionStatus = reportData.status === 'completed' ? 'completed' : 'draft';

    const updateData = {
      form_data: reportData,
      status: inspectionStatus,
      submitted_at: inspectionStatus === 'completed' ? now : (existingReport as any).submitted_at,
      inspection_date: reportData.preparedDate,
      remarks: reportData.remarks || null,
      updated_at: now,
    };

    const { data: updatedReport, error } = await (supabase
      .from('inspections') as any)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      return res.status(500).json({ error: 'Failed to update report', details: error.message });
    }

    // Log report update
    await logAuditTrail({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'UPDATE',
      entityType: 'inspection',
      entityId: id,
      description: `Updated manhours report for ${reportData.reportMonth} ${reportData.reportYear}`,
      oldValues: existingReport,
      newValues: updateData,
    });

    return res.status(200).json({
      report: updatedReport,
      message: 'Report updated successfully',
    });
  } catch (error) {
    console.error('Update manhours report error:', error);
    return res.status(500).json({ error: 'Failed to update report' });
  }
}

// DELETE /api/manhours/[id]
async function deleteManhoursReport(id: string, res: NextApiResponse, user: User) {
  try {
    const supabase = getServiceSupabase();

    // First, get the existing report
    const { data: existingReport, error: fetchError } = await supabase
      .from('inspections')
      .select('*')
      .eq('id', id)
      .eq('inspection_type', 'manhours_report')
      .single();

    if (fetchError || !existingReport) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Check if user has permission to delete this report
    if (user.role === 'inspector' && (existingReport as any).inspector_id !== user.id) {
      return res.status(403).json({ error: 'You do not have permission to delete this report' });
    }

    // Soft delete - mark as deleted
    const { error } = await (supabase
      .from('inspections') as any)
      .update({
        status: 'draft',
        deleted_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Supabase delete error:', error);
      return res.status(500).json({ error: 'Failed to delete report' });
    }

    // Log report deletion
    await logAuditTrail({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'DELETE',
      entityType: 'inspection',
      entityId: id,
      description: `Deleted manhours report`,
      oldValues: existingReport,
    });

    return res.status(200).json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Delete manhours report error:', error);
    return res.status(500).json({ error: 'Failed to delete report' });
  }
}

export default withRBAC(handler, {
  requiredPermission: 'canViewInspections',
});
