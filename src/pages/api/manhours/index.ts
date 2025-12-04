// src/pages/api/manhours/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { withRBAC } from '@/lib/rbac';
import { User } from '@/hooks/useAuth';
import { getServiceSupabase, logAuditTrail } from '@/lib/supabase';
import {
  validateBody,
  validateQuery,
  ManhoursReportSchema,
  ListQuerySchema,
} from '@/lib/validation';
import { logger } from '@/lib/logger';

export interface ManhoursReport {
  id: string;
  // Header Info
  preparedBy: string;
  preparedDate: string;
  reviewedBy?: string;
  reviewedDate?: string;
  reportMonth: string;
  reportYear: string;

  // Section 1: Statistics
  numEmployees: string;
  monthlyManHours: string;
  yearToDateManHours?: string;
  totalAccumulatedManHours?: string;
  workdaysLost?: string;
  ltiCases: string;
  noLTICases: string;
  nearMissAccidents: string;
  dangerousOccurrences: string;
  occupationalDiseases: string;

  // Section 2: Project and Monthly Data
  projectName?: string;
  monthlyData: Array<{
    month: string;
    manPower: string;
    manHours: string;
    accidents: string;
  }>;

  // Meta
  status: 'draft' | 'completed' | 'pending_review';
  createdAt: string;
  remarks?: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse, user: User) {
  if (req.method === 'GET') {
    return getManhoursReports(req, res, user);
  }
  if (req.method === 'POST') {
    return createManhoursReport(req, res, user);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

// GET /api/manhours
async function getManhoursReports(req: NextApiRequest, res: NextApiResponse, user: User) {
  const { status, year, month, page = '1', limit = '20' } = req.query;

  try {
    const supabase = getServiceSupabase();
    let query = supabase.from('inspections').select('*', { count: 'exact' });

    // Filter by manhours report type
    query = query.eq('inspection_type', 'manhours_report');

    // Filter by inspector if not admin/supervisor
    if (user.role === 'inspector') {
      query = query.eq('inspector_id', user.id);
    }

    // Filter by status
    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }

    // Sort by creation date (newest first)
    query = query.order('created_at', { ascending: false });

    // Pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const startIndex = (pageNum - 1) * limitNum;
    query = query.range(startIndex, startIndex + limitNum - 1);

    const { data: reports, error, count } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({ error: 'Failed to fetch manhours reports' });
    }

    // Debug logging
    console.log(
      `[API] Query params: year=${year}, status=${status}, month=${month}, limit=${limit}`,
    );
    console.log(`[API] Found ${reports?.length || 0} manhours reports before filtering`);

    // Apply year and month filters on the server side after fetching
    let filteredReports = reports || [];

    if (year && typeof year === 'string') {
      const originalCount = filteredReports.length;
      filteredReports = filteredReports.filter((report: any) => {
        const reportYear = report.form_data?.reportYear?.toString();
        const matches = reportYear === year;
        if (!matches) {
          console.log(`[API] Filtering out report: reportYear=${reportYear} (expected ${year})`);
        }
        return matches;
      });
      console.log(`[API] Year filter: ${originalCount} -> ${filteredReports.length} reports`);
    }

    if (month && typeof month === 'string') {
      filteredReports = filteredReports.filter((report: any) => {
        return report.form_data?.reportMonth === month;
      });
      console.log(`[API] Month filter: ${filteredReports.length} reports`);
    }

    // Log what we're returning
    filteredReports.forEach((report: any) => {
      const formData = report.form_data;
      console.log(
        `[API] Returning report: ${formData?.reportMonth} ${formData?.reportYear}, status=${report.status}`,
      );
    });

    return res.status(200).json({
      reports: filteredReports,
      total: filteredReports.length,
      page: pageNum,
      totalPages: Math.ceil(filteredReports.length / limitNum),
    });
  } catch (error) {
    console.error('Get manhours reports error:', error);
    return res.status(500).json({ error: 'Failed to fetch manhours reports' });
  }
}

// POST /api/manhours
async function createManhoursReport(req: NextApiRequest, res: NextApiResponse, user: User) {
  // Validate request body
  const validation = validateBody(ManhoursReportSchema, req.body);
  if (!validation.success) {
    logger.warn('Manhours report validation failed', {
      errors: validation.details,
      userId: user.id,
    });
    return res.status(400).json(validation);
  }

  const reportData = validation.data as ManhoursReport;

  try {
    const supabase = getServiceSupabase();
    const now = new Date().toISOString();

    // Map status from old format to new format
    let inspectionStatus: 'draft' | 'pending_review' | 'completed' | 'approved' | 'rejected' =
      'draft';
    if (reportData.status === 'completed') {
      inspectionStatus = 'completed';
    } else if (reportData.status === 'pending_review') {
      inspectionStatus = 'pending_review';
    }

    const inspectionData = {
      inspection_type: 'manhours_report' as const,
      inspector_id: user.id,
      inspected_by: reportData.preparedBy,
      designation: user.role || null,
      location_id: null,
      asset_id: null,
      form_template_id: null,
      form_data: reportData,
      signature: null,
      status: inspectionStatus,
      submitted_at:
        inspectionStatus === 'completed' || inspectionStatus === 'pending_review' ? now : null,
      inspection_date: reportData.preparedDate,
      remarks: reportData.remarks || null,
    };

    const { data: newReport, error } = await (supabase.from('inspections') as any)
      .insert(inspectionData)
      .select()
      .single();

    if (error) {
      logger.error('Create manhours report error', error, { userId: user.id });
      return res
        .status(500)
        .json({ error: 'Failed to create manhours report', details: error.message });
    }

    logger.info('Manhours report created', {
      reportId: newReport.id,
      month: reportData.reportMonth,
      year: reportData.reportYear,
      userId: user.id,
    });

    // Log report creation
    await logAuditTrail({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'CREATE',
      entityType: 'inspection',
      entityId: newReport.id,
      description: `Created manhours report for ${reportData.reportMonth} ${reportData.reportYear}`,
      newValues: inspectionData,
    });

    return res.status(201).json({
      report: newReport,
      message: 'Manhours report created successfully',
    });
  } catch (error) {
    console.error('Create manhours report error:', error);
    return res.status(500).json({ error: 'Failed to create manhours report' });
  }
}

export default withRBAC(handler, {
  requiredPermission: 'canCreateInspections',
});
