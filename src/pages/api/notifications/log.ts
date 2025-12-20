// =====================================================
// API: Log Notification Events
// =====================================================
// POST /api/notifications/log
// Logs notification delivery, clicks, and dismissals
// =====================================================

import { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, notificationId, actionClicked } = req.body;

    if (!action || !notificationId) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['action', 'notificationId'],
      });
    }

    const supabase = getServiceSupabase();
    const timestamp = new Date().toISOString();

    // Update notification log based on action
    const updates: any = {
      status: action === 'clicked' ? 'clicked' : 'delivered',
    };

    if (action === 'delivered') {
      updates.delivered_at = timestamp;
    } else if (action === 'clicked') {
      updates.clicked_at = timestamp;
      if (actionClicked) {
        updates.data = { actionClicked };
      }
    }

    const { error } = await supabase
      .from('notification_log')
      .update(updates)
      .eq('id', notificationId);

    if (error) {
      console.error('Error logging notification event:', error);
      // Don't fail the request if logging fails
      return res.status(200).json({ message: 'Event logged (with errors)' });
    }

    return res.status(200).json({ message: 'Event logged successfully' });
  } catch (error) {
    console.error('Log notification error:', error);
    // Don't fail the request if logging fails
    return res.status(200).json({ message: 'Event logging failed' });
  }
}
