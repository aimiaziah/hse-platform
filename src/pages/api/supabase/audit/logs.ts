// src/pages/api/supabase/audit/logs.ts - Audit Trail API
import { NextApiResponse } from 'next';
import { withRBAC, AuthenticatedRequest } from '@/lib/supabase-middleware';
import { getServiceSupabase } from '@/lib/supabase';

/**
 * GET /api/supabase/audit/logs - Get audit trail logs
 */
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const supabase = getServiceSupabase();

  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const {
      action,
      entity_type,
      user_id,
      severity,
      start_date,
      end_date,
      limit = '100',
      offset = '0',
    } = req.query;

    let query = supabase.from('audit_trail').select('*', { count: 'exact' });

    // Apply filters
    if (action) {
      query = query.eq('action', action);
    }
    if (entity_type) {
      query = query.eq('entity_type', entity_type);
    }
    if (user_id) {
      query = query.eq('user_id', user_id);
    }
    if (severity) {
      query = query.eq('severity', severity);
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
      console.error('Error fetching audit logs:', error);
      return res.status(500).json({ error: 'Failed to fetch audit logs' });
    }

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        total: count || 0,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    console.error('Audit logs API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Export with RBAC middleware - only admins can view audit logs
export default withRBAC(handler, {
  requiredRole: 'admin',
});
