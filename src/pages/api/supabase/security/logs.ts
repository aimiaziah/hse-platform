// src/pages/api/supabase/security/logs.ts - Security Logs API
import { NextApiResponse } from 'next';
import { withRBAC, AuthenticatedRequest } from '@/lib/supabase-middleware';
import { getServiceSupabase } from '@/lib/supabase';

/**
 * GET /api/supabase/security/logs - Get security logs (DevSecOps)
 *   Query params:
 *     - type: 'list' | 'stats' | 'timeline' (default: 'list')
 *     - days: number (for timeline, default: 7)
 *     - event_type, severity, requires_action, min_risk_level, start_date, end_date, limit, offset
 * PATCH /api/supabase/security/logs/[id] - Mark security event as actioned
 */
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const supabase = getServiceSupabase();

  try {
    // GET - List security logs, stats, or timeline
    if (req.method === 'GET') {
      const {
        type = 'list',
        days = '7',
        event_type,
        severity,
        requires_action,
        min_risk_level,
        start_date,
        end_date,
        limit = '100',
        offset = '0',
      } = req.query;

      // Handle stats endpoint
      if (type === 'stats') {
        const { data: allLogs, error: statsError } = await supabase
          .from('security_logs')
          .select('event_type, severity, risk_level, requires_action, timestamp');

        if (statsError) {
          console.error('Error fetching stats:', statsError);
          // Return empty stats if table doesn't exist or is empty
          return res.status(200).json({
            success: true,
            data: {
              total: 0,
              by_severity: { info: 0, warning: 0, error: 0, critical: 0 },
              by_event_type: {},
              requires_action: 0,
              high_risk: 0,
              failed_logins: 0,
              last_24h: 0,
              last_7d: 0,
              last_30d: 0,
            },
          });
        }

        // Calculate statistics
        const stats = {
          total: allLogs?.length || 0,
          by_severity: {
            info: 0,
            warning: 0,
            error: 0,
            critical: 0,
          },
          by_event_type: {} as Record<string, number>,
          requires_action: 0,
          high_risk: 0,
          failed_logins: 0,
          last_24h: 0,
          last_7d: 0,
          last_30d: 0,
        };

        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        allLogs?.forEach((log: any) => {
          // Severity distribution
          if (stats.by_severity.hasOwnProperty(log.severity)) {
            stats.by_severity[log.severity as keyof typeof stats.by_severity]++;
          }

          // Event type distribution
          const eventType = log.event_type || 'UNKNOWN';
          stats.by_event_type[eventType] = (stats.by_event_type[eventType] || 0) + 1;

          // Failed logins
          if (eventType === 'FAILED_LOGIN') {
            stats.failed_logins++;
          }

          // Risk and action flags
          if (log.requires_action) {
            stats.requires_action++;
          }
          if (log.risk_level >= 7) {
            stats.high_risk++;
          }

          // Time-based counts
          const logDate = new Date(log.timestamp);
          if (logDate >= last24h) stats.last_24h++;
          if (logDate >= last7d) stats.last_7d++;
          if (logDate >= last30d) stats.last_30d++;
        });

        return res.status(200).json({
          success: true,
          data: stats,
        });
      }

      // Handle timeline endpoint
      if (type === 'timeline') {
        const daysNum = parseInt(days as string) || 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysNum);
        startDate.setHours(0, 0, 0, 0);

        const { data: timelineData, error: timelineError } = await supabase
          .from('security_logs')
          .select('timestamp, severity, event_type, risk_level')
          .gte('timestamp', startDate.toISOString())
          .order('timestamp', { ascending: true });

        if (timelineError) {
          console.error('Error fetching timeline:', timelineError);
          // Return empty timeline if table doesn't exist or is empty
          const emptyTimeline: Array<{
            date: string;
            total: number;
            by_severity: Record<string, number>;
          }> = [];
          for (let i = 0; i < daysNum; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const dateKey = date.toISOString().split('T')[0];
            emptyTimeline.push({
              date: dateKey,
              total: 0,
              by_severity: { info: 0, warning: 0, error: 0, critical: 0 },
            });
          }
          return res.status(200).json({
            success: true,
            data: emptyTimeline,
          });
        }

        // Group by day
        const timelineMap = new Map<
          string,
          { date: string; total: number; by_severity: Record<string, number> }
        >();

        timelineData?.forEach((log: any) => {
          const date = new Date(log.timestamp);
          const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

          if (!timelineMap.has(dateKey)) {
            timelineMap.set(dateKey, {
              date: dateKey,
              total: 0,
              by_severity: { info: 0, warning: 0, error: 0, critical: 0 },
            });
          }

          const dayData = timelineMap.get(dateKey)!;
          dayData.total++;
          if (dayData.by_severity.hasOwnProperty(log.severity)) {
            dayData.by_severity[log.severity as keyof typeof dayData.by_severity]++;
          }
        });

        // Convert to array and fill missing days
        const timeline: Array<{
          date: string;
          total: number;
          by_severity: Record<string, number>;
        }> = [];
        for (let i = 0; i < daysNum; i++) {
          const date = new Date(startDate);
          date.setDate(date.getDate() + i);
          const dateKey = date.toISOString().split('T')[0];

          if (timelineMap.has(dateKey)) {
            timeline.push(timelineMap.get(dateKey)!);
          } else {
            timeline.push({
              date: dateKey,
              total: 0,
              by_severity: { info: 0, warning: 0, error: 0, critical: 0 },
            });
          }
        }

        return res.status(200).json({
          success: true,
          data: timeline,
        });
      }

      // Default: List security logs
      let query = supabase.from('security_logs').select('*', { count: 'exact' });

      // Apply filters
      if (event_type) {
        query = query.eq('event_type', event_type);
      }
      if (severity) {
        query = query.eq('severity', severity);
      }
      if (requires_action !== undefined) {
        query = query.eq('requires_action', requires_action === 'true');
      }
      if (min_risk_level) {
        query = query.gte('risk_level', parseInt(min_risk_level as string));
      }
      if (start_date) {
        query = query.gte('timestamp', start_date);
      }
      if (end_date) {
        query = query.lte('timestamp', end_date);
      }

      // Apply pagination
      query = query
        .order('timestamp', { ascending: false })
        .range(
          parseInt(offset as string),
          parseInt(offset as string) + parseInt(limit as string) - 1,
        );

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching security logs:', error);
        return res.status(500).json({ error: 'Failed to fetch security logs' });
      }

      // Get statistics for list view
      const { data: stats } = await supabase
        .from('security_logs')
        .select('severity, risk_level, requires_action');

      const statistics = {
        total: count || 0,
        by_severity: {
          info: 0,
          warning: 0,
          error: 0,
          critical: 0,
        },
        requires_action: stats?.filter((log) => (log as any).requires_action).length || 0,
        high_risk: stats?.filter((log) => (log as any).risk_level >= 7).length || 0,
      };

      stats?.forEach((log: any) => {
        if (statistics.by_severity.hasOwnProperty(log.severity)) {
          statistics.by_severity[log.severity as keyof typeof statistics.by_severity]++;
        }
      });

      return res.status(200).json({
        success: true,
        data,
        statistics,
        pagination: {
          total: count || 0,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      });
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Security logs API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Export with RBAC middleware - only admins can view security logs
export default withRBAC(handler, {
  requiredRole: 'admin',
});
