// src/pages/api/inspections/export-status.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { withRBAC } from '@/lib/rbac';
import { User } from '@/hooks/useAuth';
import { storage } from '@/utils/storage';
import { InspectionSubmission } from './index';

/**
 * GET /api/inspections/export-status
 * Get Google Drive export status for inspections
 */
async function handler(req: NextApiRequest, res: NextApiResponse, user: User) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { inspectionId, status } = req.query;

  try {
    const inspections = storage.load('inspections', []) as InspectionSubmission[];
    let filtered = inspections;

    // Filter by inspector if not admin
    if (user.role === 'inspector') {
      filtered = filtered.filter((i) => i.inspectorId === user.id);
    }

    // Filter by specific inspection
    if (inspectionId && typeof inspectionId === 'string') {
      filtered = filtered.filter((i) => i.id === inspectionId);
    }

    // Filter by export status
    if (status && typeof status === 'string') {
      filtered = filtered.filter((i) => i.googleDriveExport?.status === status);
    }

    // Only return inspections with Google Drive export info
    const withExportInfo = filtered
      .filter((i) => i.googleDriveExport)
      .map((i) => ({
        inspectionId: i.id,
        formType: i.formType,
        inspectorName: i.inspectorName,
        submittedAt: i.submittedAt,
        exportStatus: i.googleDriveExport,
      }));

    return res.status(200).json({
      exports: withExportInfo,
      total: withExportInfo.length,
      summary: {
        pending: withExportInfo.filter((e) => e.exportStatus?.status === 'pending').length,
        success: withExportInfo.filter((e) => e.exportStatus?.status === 'success').length,
        failed: withExportInfo.filter((e) => e.exportStatus?.status === 'failed').length,
      },
    });
  } catch (error) {
    console.error('Get export status error:', error);
    return res.status(500).json({ error: 'Failed to fetch export status' });
  }
}

export default withRBAC(handler, {
  requiredPermission: 'canViewInspections',
});
