// src/pages/api/admin/announcements/index.ts - Admin Announcements CRUD API
import { NextApiResponse } from 'next';
import { withRBAC } from '@/lib/rbac';
import { getServiceSupabase, logAuditTrail } from '@/lib/supabase';
import { User } from '@/hooks/useAuth';

/**
 * GET /api/admin/announcements - List all announcements (admin only)
 * POST /api/admin/announcements - Create new announcement (admin only)
 */
async function handler(req: any, res: NextApiResponse, user: User) {
  const supabase = getServiceSupabase() as any;

  try {
    // GET - List all announcements
    if (req.method === 'GET') {
      const { data: announcements, error } = await supabase
        .from('announcements')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching announcements:', error);
        return res.status(500).json({ error: 'Failed to fetch announcements' });
      }

      return res.status(200).json({
        success: true,
        announcements: announcements || [],
      });
    }

    // POST - Create new announcement
    if (req.method === 'POST') {
      const { title, body, is_published, is_pinned } = req.body;

      if (!title || !body) {
        return res.status(400).json({ error: 'Title and body are required' });
      }

      const announcementData: any = {
        title: title.trim(),
        body: body.trim(),
        is_published: is_published === true,
        is_pinned: is_pinned === true,
        created_by: user.id,
      };

      // Set published_at if publishing
      if (is_published === true) {
        announcementData.published_at = new Date().toISOString();
      }

      const { data: announcement, error } = (await supabase
        .from('announcements')
        .insert(announcementData)
        .select()
        .single()) as { data: any; error: any };

      if (error) {
        console.error('Error creating announcement:', error);
        return res.status(500).json({ error: 'Failed to create announcement' });
      }

      // Log audit trail
      await logAuditTrail({
        userId: user.id,
        userName: user.name,
        action: 'CREATE',
        entityType: 'announcement',
        entityId: announcement.id,
        description: `Created announcement: ${title}`,
        newValues: { title, is_published },
      });

      return res.status(201).json({
        success: true,
        announcement,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Announcements API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Export with RBAC middleware - only admins can manage announcements
export default withRBAC(handler, {
  requiredRole: 'admin',
});
