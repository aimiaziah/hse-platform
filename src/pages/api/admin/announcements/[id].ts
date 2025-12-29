// src/pages/api/admin/announcements/[id].ts - Single Announcement CRUD API
import { NextApiResponse } from 'next';
import { withRBAC } from '@/lib/rbac';
import { getServiceSupabase, logAuditTrail } from '@/lib/supabase';
import { User } from '@/hooks/useAuth';

/**
 * GET /api/admin/announcements/[id] - Get single announcement
 * PUT /api/admin/announcements/[id] - Update announcement
 * DELETE /api/admin/announcements/[id] - Delete announcement
 */
async function handler(req: any, res: NextApiResponse, user: User) {
  const supabase = getServiceSupabase() as any;
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid announcement ID' });
  }

  try {
    // GET - Fetch single announcement
    if (req.method === 'GET') {
      const { data: announcement, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('id', id)
        .single() as { data: any; error: any };

      if (error || !announcement) {
        return res.status(404).json({ error: 'Announcement not found' });
      }

      return res.status(200).json({
        success: true,
        announcement,
      });
    }

    // PUT - Update announcement
    if (req.method === 'PUT') {
      const { title, body, is_published, is_pinned } = req.body;

      // Get existing announcement for audit trail
      const { data: existingAnnouncement } = (await supabase
        .from('announcements')
        .select('*')
        .eq('id', id)
        .single()) as { data: any; error: any };

      if (!existingAnnouncement) {
        return res.status(404).json({ error: 'Announcement not found' });
      }

      const updateData: any = {};

      if (title !== undefined) {
        updateData.title = title.trim();
      }
      if (body !== undefined) {
        updateData.body = body.trim();
      }
      if (is_published !== undefined) {
        updateData.is_published = is_published === true;
        // Set published_at if publishing for the first time
        if (is_published === true && !existingAnnouncement.published_at) {
          updateData.published_at = new Date().toISOString();
        }
        // Clear published_at if unpublishing
        if (is_published === false) {
          updateData.published_at = null;
        }
      }
      if (is_pinned !== undefined) {
        updateData.is_pinned = is_pinned === true;
      }

      const { data: announcement, error } = (await supabase
        .from('announcements')
        .update(updateData as any)
        .eq('id', id)
        .select()
        .single()) as { data: any; error: any };

      if (error) {
        console.error('Error updating announcement:', error);
        return res.status(500).json({ error: 'Failed to update announcement' });
      }

      // Log audit trail
      await logAuditTrail({
        userId: user.id,
        userName: user.name,
        action: 'UPDATE',
        entityType: 'announcement',
        entityId: id,
        description: `Updated announcement: ${announcement.title}`,
        oldValues: existingAnnouncement,
        newValues: updateData,
      });

      return res.status(200).json({
        success: true,
        announcement,
      });
    }

    // DELETE - Delete announcement
    if (req.method === 'DELETE') {
      // Get existing announcement for audit trail
      const { data: existingAnnouncement } = (await supabase
        .from('announcements')
        .select('*')
        .eq('id', id)
        .single()) as { data: any; error: any };

      if (!existingAnnouncement) {
        return res.status(404).json({ error: 'Announcement not found' });
      }

      const { error } = await supabase.from('announcements').delete().eq('id', id);

      if (error) {
        console.error('Error deleting announcement:', error);
        return res.status(500).json({ error: 'Failed to delete announcement' });
      }

      // Log audit trail
      await logAuditTrail({
        userId: user.id,
        userName: user.name,
        action: 'DELETE',
        entityType: 'announcement',
        entityId: id,
        description: `Deleted announcement: ${existingAnnouncement.title}`,
        oldValues: existingAnnouncement,
      });

      return res.status(200).json({
        success: true,
        message: 'Announcement deleted successfully',
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Announcement API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Export with RBAC middleware - only admins can manage announcements
export default withRBAC(handler, {
  requiredRole: 'admin',
});
