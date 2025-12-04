// src/pages/api/supabase/security/logs.ts - Security Logs API
import { NextApiResponse } from 'next';
import { withRBAC, AuthenticatedRequest } from '@/lib/supabase-middleware';
import { getServiceSupabase } from '@/lib/supabase';

/**
 * GET /api/supabase/security/logs - Get security logs (DevSecOps)
 * PATCH /api/supabase/security/logs/[id] - Mark security event as actioned
 */
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const supabase = getServiceSupabase();

  try {
    // GET - List security logs
    if (req.method === 'GET') {
      const {
        event_type,
        severity,
        requires_action,
        min_risk_level,
        start_date,
        end_date,
        limit = '100',
        offset = '0',
      } = req.query;

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
        .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching security logs:', error);
        return res.status(500).json({ error: 'Failed to fetch security logs' });
      }

      // Get statistics
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
