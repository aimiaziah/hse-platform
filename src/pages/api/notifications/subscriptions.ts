// =====================================================
// API: Get User's Push Subscriptions
// =====================================================
// GET /api/notifications/subscriptions
// Returns all active push subscriptions for the user
// =====================================================

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

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id, device_name, user_agent, created_at, last_used_at, endpoint')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }

    return res.status(200).json({
      subscriptions: subscriptions || [],
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    return res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
}

export default withRBAC(handler, {
  requiredPermission: 'canViewInspections',
});
