// src/pages/api/auth/me.ts - Get current user from auth token
import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/jwt';
import { parse } from 'cookie';
import { getServiceSupabase } from '@/lib/supabase';

interface UserResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    signature?: string | null;
    profilePicture?: string | null;
    permissions: any;
  };
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<UserResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Get auth token from cookie
    const cookies = parse(req.headers.cookie || '');
    const token = cookies['auth-token'];

    if (!token) {
      return res.status(401).json({ success: false, error: 'No auth token found' });
    }

    // Verify and decode token
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    // Fetch user from database
    const supabase = getServiceSupabase();
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select(
        `
        *,
        user_permissions (
          can_manage_users,
          can_manage_forms,
          can_create_inspections,
          can_view_inspections,
          can_review_inspections,
          can_approve_inspections,
          can_reject_inspections,
          can_view_pending_inspections,
          can_view_analytics
        )
      `,
      )
      .eq('id', decoded.userId)
      .eq('is_active', true)
      .single();

    if (fetchError || !userData) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const permissions = (userData as any).user_permissions || {};

    // Return user data
    const userResponse = {
      id: (userData as any).id,
      email: (userData as any).email,
      name: (userData as any).name,
      role: (userData as any).role,
      signature: (userData as any).signature || null,
      profilePicture: (userData as any).profile_picture || null,
      permissions: {
        canManageUsers: permissions.can_manage_users || false,
        canManageForms: permissions.can_manage_forms || false,
        canCreateInspections: permissions.can_create_inspections || false,
        canViewInspections: permissions.can_view_inspections || false,
        canReviewInspections: permissions.can_review_inspections || false,
        canApproveInspections: permissions.can_approve_inspections || false,
        canRejectInspections: permissions.can_reject_inspections || false,
        canViewPendingInspections: permissions.can_view_pending_inspections || false,
        canViewAnalytics: permissions.can_view_analytics || false,
      },
    };

    return res.status(200).json({
      success: true,
      user: userResponse,
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
