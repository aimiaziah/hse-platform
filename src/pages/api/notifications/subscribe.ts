// =====================================================
// API: Subscribe to Push Notifications
// =====================================================
// POST /api/notifications/subscribe
// =====================================================

import { NextApiRequest, NextApiResponse } from 'next';
import { withRBAC } from '@/lib/rbac';
import { User } from '@/hooks/useAuth';
import { getServiceSupabase } from '@/lib/supabase';
import { validatePushSubscription } from '@/lib/web-push';

async function handler(req: NextApiRequest, res: NextApiResponse, user: User) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscription, userAgent, deviceName, oldEndpoint } = req.body;

    // Validate subscription object
    if (!validatePushSubscription(subscription)) {
      return res.status(400).json({
        error: 'Invalid subscription object',
        required: ['endpoint', 'keys.p256dh', 'keys.auth'],
      });
    }

    const supabase = getServiceSupabase();

    // If oldEndpoint provided, this is a subscription update
    if (oldEndpoint) {
      // Deactivate old subscription
      await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('endpoint', oldEndpoint);
    }

    // Check if subscription already exists
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('endpoint', subscription.endpoint)
      .single();

    if (existing) {
      // Update existing subscription
      const { error } = await supabase
        .from('push_subscriptions')
        .update({
          p256dh_key: subscription.keys.p256dh,
          auth_key: subscription.keys.auth,
          user_agent: userAgent || null,
          device_name: deviceName || null,
          is_active: true,
          updated_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) {
        console.error('Error updating subscription:', error);
        return res.status(500).json({ error: 'Failed to update subscription' });
      }

      return res.status(200).json({
        message: 'Subscription updated successfully',
        subscriptionId: existing.id,
      });
    }

    // Create new subscription
    const { data: newSubscription, error } = await supabase
      .from('push_subscriptions')
      .insert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh_key: subscription.keys.p256dh,
        auth_key: subscription.keys.auth,
        user_agent: userAgent || null,
        device_name: deviceName || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating subscription:', error);
      return res.status(500).json({ error: 'Failed to create subscription' });
    }

    // Create default notification preferences if they don't exist
    await supabase
      .from('notification_preferences')
      .insert({
        user_id: user.id,
      })
      .onConflict('user_id')
      .ignore();

    return res.status(201).json({
      message: 'Subscription created successfully',
      subscriptionId: newSubscription.id,
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    return res.status(500).json({
      error: 'Failed to process subscription',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export default withRBAC(handler, {
  requiredPermission: 'canViewInspections',
});
