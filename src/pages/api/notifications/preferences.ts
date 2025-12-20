// =====================================================
// API: Notification Preferences
// =====================================================
// GET/PUT /api/notifications/preferences
// Manage user notification preferences
// =====================================================

import { NextApiRequest, NextApiResponse } from 'next';
import { withRBAC } from '@/lib/rbac';
import { User } from '@/hooks/useAuth';
import { getServiceSupabase } from '@/lib/supabase';

async function handler(req: NextApiRequest, res: NextApiResponse, user: User) {
  const supabase = getServiceSupabase();

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" error
        console.error('Error fetching preferences:', error);
        return res.status(500).json({ error: 'Failed to fetch preferences' });
      }

      // If no preferences exist, create default ones
      if (!data) {
        const { data: newPrefs, error: createError } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: user.id,
            notify_on_assignment: true,
            notify_on_approval: true,
            notify_on_rejection: true,
            notify_on_comments: true,
            quiet_hours_enabled: false,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating default preferences:', createError);
          return res.status(500).json({ error: 'Failed to create preferences' });
        }

        return res.status(200).json({ preferences: newPrefs });
      }

      return res.status(200).json({ preferences: data });
    } catch (error) {
      console.error('Get preferences error:', error);
      return res.status(500).json({ error: 'Failed to fetch preferences' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const {
        notify_on_assignment,
        notify_on_approval,
        notify_on_rejection,
        notify_on_comments,
        quiet_hours_enabled,
        quiet_hours_start,
        quiet_hours_end,
      } = req.body;

      const { data, error } = await supabase
        .from('notification_preferences')
        .update({
          notify_on_assignment,
          notify_on_approval,
          notify_on_rejection,
          notify_on_comments,
          quiet_hours_enabled,
          quiet_hours_start,
          quiet_hours_end,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating preferences:', error);
        return res.status(500).json({ error: 'Failed to update preferences' });
      }

      return res.status(200).json({
        message: 'Preferences updated successfully',
        preferences: data,
      });
    } catch (error) {
      console.error('Update preferences error:', error);
      return res.status(500).json({ error: 'Failed to update preferences' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withRBAC(handler, {
  requiredPermission: 'canViewInspections',
});
