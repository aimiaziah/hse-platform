// =====================================================
// API: Send Push Notification
// =====================================================
// POST /api/notifications/send
// Internal API for sending notifications to users
// =====================================================

import { NextApiRequest, NextApiResponse } from 'next';
import { withRBAC } from '@/lib/rbac';
import { User } from '@/hooks/useAuth';
import { getServiceSupabase, logAuditTrail } from '@/lib/supabase';
import {
  sendPushNotificationToMultiple,
  NotificationPayload,
  PushSubscriptionData,
} from '@/lib/web-push';

async function handler(req: NextApiRequest, res: NextApiResponse, user: User) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, userIds, role, notificationType, title, body, data, inspectionId } = req.body;

    // Validate required fields
    if (!title || !body) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['title', 'body'],
      });
    }

    const supabase = getServiceSupabase();

    // Build query to get target users' subscriptions
    let query = supabase
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh_key, auth_key')
      .eq('is_active', true);

    // Filter by user ID, multiple user IDs, or role
    if (userId) {
      query = query.eq('user_id', userId);
    } else if (userIds && Array.isArray(userIds)) {
      query = query.in('user_id', userIds);
    } else if (role) {
      // Get users with specific role
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id')
        .eq('role', role)
        .eq('is_active', true);

      if (usersError || !users || users.length === 0) {
        return res.status(404).json({ error: 'No active users found with that role' });
      }

      const userIdList = users.map((u) => u.id);
      query = query.in('user_id', userIdList);
    } else {
      return res.status(400).json({
        error: 'Must specify userId, userIds, or role',
      });
    }

    // Get subscriptions
    const { data: subscriptions, error: subsError } = await query;

    if (subsError) {
      console.error('Error fetching subscriptions:', subsError);
      return res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(404).json({
        error: 'No active push subscriptions found',
        message: 'Users may not have enabled notifications',
      });
    }

    // Check user notification preferences
    const targetUserIds = [...new Set(subscriptions.map((s) => s.user_id))];
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('*')
      .in('user_id', targetUserIds);

    // Filter subscriptions based on preferences
    const filteredSubscriptions = subscriptions.filter((sub) => {
      const pref = preferences?.find((p) => p.user_id === sub.user_id);
      if (!pref) return true; // No preferences set, send by default

      // Check notification type preferences
      if (notificationType === 'inspection_assigned' && !pref.notify_on_assignment) return false;
      if (notificationType === 'inspection_approved' && !pref.notify_on_approval) return false;
      if (notificationType === 'inspection_rejected' && !pref.notify_on_rejection) return false;
      if (notificationType === 'comment_added' && !pref.notify_on_comments) return false;

      // Check quiet hours
      if (pref.quiet_hours_enabled && pref.quiet_hours_start && pref.quiet_hours_end) {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
        if (currentTime >= pref.quiet_hours_start && currentTime <= pref.quiet_hours_end) {
          return false;
        }
      }

      return true;
    });

    if (filteredSubscriptions.length === 0) {
      return res.status(200).json({
        message: 'No notifications sent (filtered by user preferences)',
        sent: 0,
      });
    }

    // Prepare notification payload
    const payload: NotificationPayload = {
      title,
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      tag: notificationType || 'default',
      requireInteraction: notificationType === 'inspection_assigned',
      data: {
        ...data,
        type: notificationType,
        inspectionId,
        timestamp: new Date().toISOString(),
      },
      actions: [],
    };

    // Add action buttons based on notification type
    if (notificationType === 'inspection_assigned') {
      payload.actions = [
        { action: 'review', title: 'Review Now' },
        { action: 'dismiss', title: 'Later' },
      ];
    } else if (
      notificationType === 'inspection_approved' ||
      notificationType === 'inspection_rejected'
    ) {
      payload.actions = [{ action: 'view', title: 'View Details' }];
    }

    // Convert to web-push format
    const pushSubscriptions: PushSubscriptionData[] = filteredSubscriptions.map((sub) => ({
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh_key,
        auth: sub.auth_key,
      },
    }));

    // Send notifications
    const result = await sendPushNotificationToMultiple(pushSubscriptions, payload);

    // Log notifications to database
    const notificationLogs = filteredSubscriptions.map((sub) => ({
      user_id: sub.user_id,
      inspection_id: inspectionId || null,
      notification_type: notificationType || 'general',
      title,
      body,
      data,
      status: 'sent',
      sent_at: new Date().toISOString(),
    }));

    const { error: logError } = await supabase.from('notification_log').insert(notificationLogs);

    if (logError) {
      console.error('Error logging notifications:', logError);
    }

    // Remove expired subscriptions
    if (result.expired.length > 0) {
      await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .in('endpoint', result.expired);
    }

    // Log audit trail
    await logAuditTrail({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'SEND_NOTIFICATION',
      entityType: 'notification',
      entityId: inspectionId || 'n/a',
      description: `Sent notification: ${title}`,
      newValues: {
        recipients: filteredSubscriptions.length,
        successful: result.successful,
        failed: result.failed,
      },
    });

    return res.status(200).json({
      message: 'Notifications sent',
      sent: result.successful,
      failed: result.failed,
      expired: result.expired.length,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error('Send notification error:', error);
    return res.status(500).json({
      error: 'Failed to send notifications',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Only admins and supervisors can send notifications
export default withRBAC(handler, {
  allowedRoles: ['admin', 'supervisor'],
});
