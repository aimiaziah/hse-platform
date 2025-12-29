// src/pages/api/jobs/status.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { withRBAC } from '@/lib/rbac';
import { User } from '@/hooks/useAuth';
import { getServiceSupabase } from '@/lib/supabase';

/**
 * API endpoint to get job queue status
 * GET /api/jobs/status
 */
async function handler(req: NextApiRequest, res: NextApiResponse, user: User) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getServiceSupabase();

    // Get job counts by status
    const { data: statusCounts, error: statusError } = await supabase.rpc('get_job_status_counts');

    if (statusError) {
      console.error('[Job Status] Error getting status counts:', statusError);
    }

    // Get recent jobs (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: recentJobs, error: recentError } = await supabase
      .from('job_queue')
      .select('*')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    if (recentError) {
      console.error('[Job Status] Error getting recent jobs:', recentError);
    }

    // Get pending jobs count
    const { count: pendingCount } = await supabase
      .from('job_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Get failed jobs count (that can be retried)
    const { data: failedJobs } = await supabase
      .from('job_queue')
      .select('id, retry_count, max_retries')
      .eq('status', 'failed');

    const retriableFailedCount =
      failedJobs?.filter((j) => j.retry_count < j.max_retries).length || 0;

    // Get processing jobs (stuck jobs check)
    const { data: processingJobs } = await supabase
      .from('job_queue')
      .select('id, started_at')
      .eq('status', 'processing');

    const stuckJobs =
      processingJobs?.filter((j) => {
        if (!j.started_at) return false;
        const startTime = new Date(j.started_at);
        const now = new Date();
        const minutesElapsed = (now.getTime() - startTime.getTime()) / (1000 * 60);
        return minutesElapsed > 30; // Consider stuck if processing for more than 30 minutes
      }) || [];

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          pending: pendingCount || 0,
          retriableFailed: retriableFailedCount,
          stuck: stuckJobs.length,
        },
        recentJobs: recentJobs || [],
        stuckJobs: stuckJobs.map((j) => j.id),
      },
    });
  } catch (error: any) {
    console.error('[Job Status] Error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to get job status',
    });
  }
}

export default withRBAC(handler, {
  requiredPermission: 'canManageSettings',
});
