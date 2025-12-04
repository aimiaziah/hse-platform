// src/pages/api/supabase/analytics/dashboard.ts - Analytics Dashboard API
import { NextApiResponse } from 'next';
import { withRBAC, AuthenticatedRequest } from '@/lib/supabase-middleware';
import { getServiceSupabase } from '@/lib/supabase';

/**
 * GET /api/supabase/analytics/dashboard - Get dashboard analytics
 */
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const supabase = getServiceSupabase();

  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { period = 'month' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const startDateStr = startDate.toISOString().split('T')[0];

    // Get inspection counts by status
    const { data: statusCounts } = await supabase
      .from('inspections')
      .select('status')
      .gte('created_at', startDateStr);

    const statusSummary = {
      draft: 0,
      pending_review: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
      total: statusCounts?.length || 0,
    };

    statusCounts?.forEach((inspection: any) => {
      if (statusSummary.hasOwnProperty(inspection.status)) {
        statusSummary[inspection.status as keyof typeof statusSummary]++;
      }
    });

    // Get inspection counts by type
    const { data: typeCounts } = await supabase
      .from('inspections')
      .select('inspection_type')
      .gte('created_at', startDateStr);

    const typeSummary = {
      fire_extinguisher: 0,
      first_aid: 0,
      hse_general: 0,
    };

    typeCounts?.forEach((inspection: any) => {
      if (typeSummary.hasOwnProperty(inspection.inspection_type)) {
        typeSummary[inspection.inspection_type as keyof typeof typeSummary]++;
      }
    });

    // Get pending inspections
    const { data: pendingInspections } = await supabase
      .from('v_pending_inspections')
      .select('*')
      .order('hours_pending', { ascending: false })
      .limit(10);

    // Get recent inspections
    const { data: recentInspections } = await supabase
      .from('v_inspections_detailed')
      .select('*')
      .gte('created_at', startDateStr)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get inspector performance
    const { data: inspectorStats } = await supabase
      .from('inspections')
      .select('inspector_id, inspected_by, status')
      .gte('created_at', startDateStr);

    const inspectorPerformance: Record<
      string,
      {
        name: string;
        total: number;
        approved: number;
        rejected: number;
        pending: number;
      }
    > = {};

    inspectorStats?.forEach((inspection: any) => {
      if (!inspectorPerformance[inspection.inspector_id]) {
        inspectorPerformance[inspection.inspector_id] = {
          name: inspection.inspected_by,
          total: 0,
          approved: 0,
          rejected: 0,
          pending: 0,
        };
      }

      const perf = inspectorPerformance[inspection.inspector_id];
      perf.total++;

      if (inspection.status === 'approved') perf.approved++;
      else if (inspection.status === 'rejected') perf.rejected++;
      else if (inspection.status === 'pending_review') perf.pending++;
    });

    // Get assets requiring inspection
    const { data: assetsRequiringInspection } = await supabase
      .from('v_assets_requiring_inspection')
      .select('*')
      .in('status', ['expired', 'expiring_soon', 'overdue'])
      .limit(20);

    // Calculate compliance rate
    const totalCompleted = statusSummary.approved + statusSummary.rejected;
    const complianceRate =
      totalCompleted > 0 ? ((statusSummary.approved / totalCompleted) * 100).toFixed(2) : 0;

    // Get location statistics
    const { data: locationStats } = await supabase
      .from('inspections')
      .select('location_id, locations(name)')
      .gte('created_at', startDateStr);

    const locationSummary: Record<string, number> = {};
    locationStats?.forEach((inspection: any) => {
      const locationName = inspection.locations?.name || 'Unknown';
      locationSummary[locationName] = (locationSummary[locationName] || 0) + 1;
    });

    // Response
    return res.status(200).json({
      success: true,
      data: {
        period: {
          type: period,
          start: startDateStr,
          end: now.toISOString().split('T')[0],
        },
        summary: {
          ...statusSummary,
          complianceRate: parseFloat(complianceRate as string),
        },
        byType: typeSummary,
        byLocation: locationSummary,
        inspectorPerformance: Object.values(inspectorPerformance),
        pendingInspections: pendingInspections || [],
        recentInspections: recentInspections || [],
        assetsRequiringInspection: assetsRequiringInspection || [],
      },
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Export with RBAC middleware
export default withRBAC(handler, {
  requiredPermission: ['can_view_analytics', 'can_manage_users', 'can_review_inspections'],
  requireAll: false,
});
