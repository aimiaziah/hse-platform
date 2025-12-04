// src/pages/api/inspections/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { withRBAC } from '@/lib/rbac';
import { User } from '@/hooks/useAuth';
import { getServiceSupabase, logAuditTrail } from '@/lib/supabase';
import { InspectionStatus } from '@/types/database';

async function handler(req: NextApiRequest, res: NextApiResponse, user: User) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid inspection ID' });
  }

  if (req.method === 'GET') {
    return getInspection(req, res, id, user);
  }
  if (req.method === 'PUT') {
    return updateInspection(req, res, id, user);
  }
  if (req.method === 'DELETE') {
    return deleteInspection(req, res, id, user);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

// GET /api/inspections/[id]
async function getInspection(
  req: NextApiRequest,
  res: NextApiResponse,
  inspectionId: string,
  user: User,
) {
  try {
    const supabase = getServiceSupabase();

    const { data: inspection, error } = await supabase
      .from('inspections')
      .select('*')
      .eq('id', inspectionId)
      .single();

    if (error || !inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    // Check permission: inspectors can only view their own
    if (user.role === 'inspector' && (inspection as any).inspector_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden - You can only view your own inspections' });
    }

    return res.status(200).json({ inspection });
  } catch (error) {
    console.error('Get inspection error:', error);
    return res.status(500).json({ error: 'Failed to fetch inspection' });
  }
}

// PUT /api/inspections/[id]
async function updateInspection(
  req: NextApiRequest,
  res: NextApiResponse,
  inspectionId: string,
  user: User,
) {
  const { data, signature, status, reviewComments } = req.body;

  try {
    const supabase = getServiceSupabase();

    // First, fetch the existing inspection
    const { data: existingInspection, error: fetchError } = await supabase
      .from('inspections')
      .select('*')
      .eq('id', inspectionId)
      .single();

    if (fetchError || !existingInspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    // Check permission: inspectors can only edit their own
    if (user.role === 'inspector' && (existingInspection as any).inspector_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden - You can only edit your own inspections' });
    }

    // Cannot edit submitted inspections (for inspectors)
    if ((existingInspection as any).status !== 'draft' && user.role === 'inspector') {
      return res.status(400).json({ error: 'Cannot edit submitted inspections' });
    }

    // Build update object
    const updateData: any = {};

    if (data) {
      updateData.form_data = data;
    }

    if (signature) {
      updateData.signature = signature.dataUrl || signature;
    }

    if (status) {
      // Map status from old format to new format
      let inspectionStatus: InspectionStatus = 'draft';
      if (status === 'submitted' || status === 'pending_review') {
        inspectionStatus = 'pending_review';
        updateData.submitted_at = updateData.submitted_at || new Date().toISOString();
      } else if (status === 'approved') {
        inspectionStatus = 'approved';
        updateData.reviewed_at = new Date().toISOString();
        updateData.reviewer_id = user.id;
      } else if (status === 'rejected') {
        inspectionStatus = 'rejected';
        updateData.reviewed_at = new Date().toISOString();
        updateData.reviewer_id = user.id;
      } else if (status === 'completed') {
        inspectionStatus = 'completed';
      }
      updateData.status = inspectionStatus;
    }

    if (reviewComments !== undefined) {
      updateData.review_comments = reviewComments;
    }

    // Perform the update
    const { data: updatedInspection, error: updateError } = await (
      supabase.from('inspections') as any
    )
      .update(updateData)
      .eq('id', inspectionId)
      .select()
      .single();

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return res
        .status(500)
        .json({ error: 'Failed to update inspection', details: updateError.message });
    }

    // Log update
    await logAuditTrail({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'UPDATE',
      entityType: 'inspection',
      entityId: inspectionId,
      description: `Updated inspection status to ${
        updateData.status || (existingInspection as any).status
      }`,
      oldValues: existingInspection,
      newValues: updateData,
    });

    return res.status(200).json({
      inspection: updatedInspection,
      message: 'Inspection updated successfully',
    });
  } catch (error) {
    console.error('Update inspection error:', error);
    return res.status(500).json({ error: 'Failed to update inspection' });
  }
}

// DELETE /api/inspections/[id]
async function deleteInspection(
  req: NextApiRequest,
  res: NextApiResponse,
  inspectionId: string,
  user: User,
) {
  try {
    const supabase = getServiceSupabase();

    // First, fetch the existing inspection
    const { data: existingInspection, error: fetchError } = await supabase
      .from('inspections')
      .select('*')
      .eq('id', inspectionId)
      .single();

    if (fetchError || !existingInspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    // Check permission: inspectors can only delete their own drafts
    if (user.role === 'inspector' && (existingInspection as any).inspector_id !== user.id) {
      return res
        .status(403)
        .json({ error: 'Forbidden - You can only delete your own inspections' });
    }

    // Can only delete drafts
    if ((existingInspection as any).status !== 'draft') {
      return res.status(400).json({ error: 'Can only delete draft inspections' });
    }

    // Delete the inspection
    const { error: deleteError } = await supabase
      .from('inspections')
      .delete()
      .eq('id', inspectionId);

    if (deleteError) {
      console.error('Supabase delete error:', deleteError);
      return res
        .status(500)
        .json({ error: 'Failed to delete inspection', details: deleteError.message });
    }

    // Log deletion
    await logAuditTrail({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'DELETE',
      entityType: 'inspection',
      entityId: inspectionId,
      description: `Deleted ${(existingInspection as any).inspection_type} inspection`,
      oldValues: existingInspection,
    });

    return res.status(200).json({ message: 'Inspection deleted successfully' });
  } catch (error) {
    console.error('Delete inspection error:', error);
    return res.status(500).json({ error: 'Failed to delete inspection' });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Increased from default 1mb to handle inspections with multiple images
    },
  },
};

export default withRBAC(handler, {
  requiredPermission: 'canViewInspections',
});
