// API endpoint to check SharePoint sync status for debugging
import { NextApiRequest, NextApiResponse } from 'next';
import { withRBAC } from '@/lib/rbac';
import { User } from '@/hooks/useAuth';
import { getServiceSupabase } from '@/lib/supabase';

async function handler(req: NextApiRequest, res: NextApiResponse, user: User) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getServiceSupabase();

    // Get recent inspections with their SharePoint sync status
    const { data: inspections, error: inspectionsError } = await supabase
      .from('inspections')
      .select(
        'id, inspection_number, inspection_type, inspected_by, inspection_date, status, sharepoint_sync_status, sharepoint_file_url, sharepoint_exported_at, created_at',
      )
      .order('created_at', { ascending: false })
      .limit(50);

    if (inspectionsError) {
      throw inspectionsError;
    }

    // Get SharePoint sync log entries (failures only)
    const { data: syncLog, error: syncLogError } = await supabase
      .from('sharepoint_sync_log')
      .select('*')
      .eq('status', 'failure')
      .order('created_at', { ascending: false })
      .limit(50);

    if (syncLogError) {
      throw syncLogError;
    }

    // Count by status
    const { data: statusCounts, error: countsError } = await supabase
      .from('inspections')
      .select('sharepoint_sync_status');

    if (countsError) {
      throw countsError;
    }

    const counts = {
      pending: statusCounts?.filter((i) => i.sharepoint_sync_status === 'pending').length || 0,
      synced: statusCounts?.filter((i) => i.sharepoint_sync_status === 'synced').length || 0,
      failed: statusCounts?.filter((i) => i.sharepoint_sync_status === 'failed').length || 0,
      retrying: statusCounts?.filter((i) => i.sharepoint_sync_status === 'retrying').length || 0,
    };

    return res.status(200).json({
      success: true,
      summary: {
        total: statusCounts?.length || 0,
        ...counts,
      },
      recentInspections: inspections || [],
      recentFailures: syncLog || [],
    });
  } catch (error) {
    console.error('SharePoint sync status error:', error);
    return res.status(500).json({
      error: 'Failed to fetch SharePoint sync status',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Only admins and supervisors can view this
export default withRBAC(handler, {
  requiredPermission: 'canViewAnalytics',
});
