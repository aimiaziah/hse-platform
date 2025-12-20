// =====================================================
// API: Unsubscribe from Push Notifications
// =====================================================
// POST /api/notifications/unsubscribe
// =====================================================

import { NextApiRequest, NextApiResponse } from 'next';
import { withRBAC } from '@/lib/rbac';
import { User } from '@/hooks/useAuth';
import { getServiceSupabase } from '@/lib/supabase';

async function handler(req: NextApiRequest, res: NextApiResponse, user: User) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    const supabase = getServiceSupabase();

    // Deactivate subscription (soft delete)
    const { error } = await supabase
      .from('push_subscriptions')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('endpoint', endpoint);

    if (error) {
      console.error('Error unsubscribing:', error);
      return res.status(500).json({ error: 'Failed to unsubscribe' });
    }

    return res.status(200).json({
      message: 'Unsubscribed successfully',
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return res.status(500).json({
      error: 'Failed to process unsubscription',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export default withRBAC(handler, {
  requiredPermission: 'canViewInspections',
});
