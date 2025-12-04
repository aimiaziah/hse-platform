// src/pages/api/supabase/notifications/index.ts - Notifications API
import { NextApiResponse } from 'next';
import { withRBAC, AuthenticatedRequest } from '@/lib/supabase-middleware';
import { getServiceSupabase } from '@/lib/supabase';

/**
 * GET /api/supabase/notifications - Get user notifications
 * PATCH /api/supabase/notifications - Mark notifications as read
 */
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const supabase = getServiceSupabase();

  try {
    // GET - Get user notifications
    if (req.method === 'GET') {
      const { is_read, type, limit = '50', offset = '0' } = req.query;

      let query = supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', req.user!.id);

      // Filter out expired notifications
      query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

      // Apply filters
      if (is_read !== undefined) {
        query = query.eq('is_read', is_read === 'true');
      }
      if (type) {
        query = query.eq('type', type);
      }

      // Apply pagination
      query = query
        .order('created_at', { ascending: false })
        .range(
          parseInt(offset as string),
          parseInt(offset as string) + parseInt(limit as string) - 1,
        );

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching notifications:', error);
        return res.status(500).json({ error: 'Failed to fetch notifications' });
      }

      // Get unread count
      const { count: unreadCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', req.user!.id)
        .eq('is_read', false)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

      return res.status(200).json({
        success: true,
        data,
        unreadCount: unreadCount || 0,
        pagination: {
          total: count || 0,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      });
    }

    // PATCH - Mark notifications as read
    if (req.method === 'PATCH') {
      const { notification_ids, mark_all } = req.body;

      if (mark_all) {
        // Mark all user notifications as read
        const { error } = await (supabase.from('notifications') as any)
          .update({
            is_read: true,
            read_at: new Date().toISOString(),
          })
          .eq('user_id', req.user!.id)
          .eq('is_read', false);

        if (error) {
          console.error('Error marking notifications as read:', error);
          return res.status(500).json({ error: 'Failed to mark notifications as read' });
        }

        return res.status(200).json({
          success: true,
          message: 'All notifications marked as read',
        });
      }

      if (!notification_ids || !Array.isArray(notification_ids)) {
        return res.status(400).json({ error: 'notification_ids array is required' });
      }

      // Mark specific notifications as read
      const { error } = await (supabase.from('notifications') as any)
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .in('id', notification_ids)
        .eq('user_id', req.user!.id); // Ensure user can only mark their own notifications

      if (error) {
        console.error('Error marking notifications as read:', error);
        return res.status(500).json({ error: 'Failed to mark notifications as read' });
      }

      return res.status(200).json({
        success: true,
        message: `${notification_ids.length} notification(s) marked as read`,
      });
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Notifications API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Export with RBAC middleware - all authenticated users can access their notifications
export default withRBAC(handler, {});
