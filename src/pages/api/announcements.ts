// src/pages/api/announcements.ts - Announcements API (Read-only for Employees)
import { NextApiRequest, NextApiResponse } from 'next';
import { withRBAC } from '@/lib/rbac';
import { getServiceSupabase } from '@/lib/supabase';
import { User } from '@/hooks/useAuth';

/**
 * GET /api/announcements - Get published announcements (read-only)
 * Returns latest published announcements, limited to 3 for employees
 */
async function handler(req: NextApiRequest, res: NextApiResponse, user: User) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { limit = '3' } = req.query;
    const limitNum = parseInt(limit as string, 10);
    const supabase = getServiceSupabase();

    // Fetch published announcements from database
    // Order by: pinned first (DESC), then by published_at (DESC)
    const { data: announcements, error } = await supabase
      .from('announcements')
      .select('id, title, body, published_at, is_pinned')
      .eq('is_published', true)
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(limitNum);

    if (error) {
      console.error('Error fetching announcements:', error);
      return res.status(500).json({ error: 'Failed to fetch announcements' });
    }

    return res.status(200).json({
      success: true,
      announcements: announcements || [],
      count: announcements?.length || 0,
    });
  } catch (error) {
    console.error('Announcements API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Export with RBAC middleware - all authenticated users can view announcements
export default withRBAC(handler, {});
