// src/pages/api/supabase/users/index.ts - Users Management API
import { NextApiResponse } from 'next';
import { withRBAC, AuthenticatedRequest } from '@/lib/supabase-middleware';
import { getServiceSupabase, logAuditTrail } from '@/lib/supabase';

/**
 * GET /api/supabase/users - List all users
 * POST /api/supabase/users - Create new user
 */
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const supabase = getServiceSupabase();

  try {
    // GET - List all users
    if (req.method === 'GET') {
      const { role, is_active, department, limit = '50', offset = '0' } = req.query;

      let query = supabase.from('v_users_with_permissions').select('*', { count: 'exact' });

      // Apply filters
      if (role) {
        query = query.eq('role', role);
      }
      if (is_active !== undefined) {
        query = query.eq('is_active', is_active === 'true');
      }
      if (department) {
        query = query.eq('department', department);
      }

      // Apply pagination
      query = query
        .order('created_at', { ascending: false })
        .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ error: 'Failed to fetch users' });
      }

      // Remove sensitive data (PIN)
      const sanitizedUsers = data?.map((item: any) => {
        const { pin, ...user } = item;
        return user;
      });

      return res.status(200).json({
        success: true,
        data: sanitizedUsers,
        pagination: {
          total: count || 0,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      });
    }

    // POST - Create new user
    if (req.method === 'POST') {
      const { email, name, pin, role, department } = req.body;

      // Validate required fields
      if (!email || !name || !pin || !role) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Validate email format
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Validate role
      const validRoles = ['admin', 'inspector', 'supervisor', 'employee'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      // Check if user already exists
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .or(`email.eq.${email},pin.eq.${pin}`)
        .single();

      if (existing) {
        return res.status(409).json({ error: 'User with this email or PIN already exists' });
      }

      // Create user
      const { data: user, error: createError } = await (supabase
        .from('users') as any)
        .insert({
          email,
          name,
          pin,
          role,
          department: department || null,
          is_active: true,
          created_by: req.user!.id,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user:', createError);
        return res.status(500).json({ error: 'Failed to create user' });
      }

      // Create permissions based on role
      const permissions = getRolePermissions(role);
      const { error: permError } = await (supabase.from('user_permissions') as any).insert({
        user_id: (user as any).id,
        ...permissions,
      });

      if (permError) {
        console.error('Error creating permissions:', permError);
        // Rollback user creation
        await supabase.from('users').delete().eq('id', user.id);
        return res.status(500).json({ error: 'Failed to set user permissions' });
      }

      // Log audit trail
      await logAuditTrail({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'CREATE',
        entityType: 'user',
        entityId: user.id,
        description: `Created new user: ${name} (${role})`,
        newValues: { ...user, pin: '***' },
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestMethod: req.method!,
        requestPath: req.url || '',
        severity: 'info',
      });

      // Remove PIN from response
      const { pin: _, ...sanitizedUser } = user;

      return res.status(201).json({
        success: true,
        data: sanitizedUser,
      });
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Users API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get default permissions for a role
 */
function getRolePermissions(role: string) {
  switch (role) {
    case 'admin':
      return {
        can_manage_users: true,
        can_manage_forms: true,
        can_create_inspections: false,
        can_view_inspections: false,
        can_review_inspections: false,
        can_approve_inspections: false,
        can_reject_inspections: false,
        can_view_pending_inspections: false,
        can_view_analytics: false,
      };
    case 'inspector':
      return {
        can_manage_users: false,
        can_manage_forms: false,
        can_create_inspections: true,
        can_view_inspections: true,
        can_review_inspections: false,
        can_approve_inspections: false,
        can_reject_inspections: false,
        can_view_pending_inspections: false,
        can_view_analytics: false,
      };
    case 'supervisor':
      return {
        can_manage_users: false,
        can_manage_forms: false,
        can_create_inspections: false,
        can_view_inspections: true,
        can_review_inspections: true,
        can_approve_inspections: true,
        can_reject_inspections: true,
        can_view_pending_inspections: true,
        can_view_analytics: false,
      };
    case 'employee':
      return {
        can_manage_users: false,
        can_manage_forms: false,
        can_create_inspections: false,
        can_view_inspections: false,
        can_review_inspections: false,
        can_approve_inspections: false,
        can_reject_inspections: false,
        can_view_pending_inspections: false,
        can_view_analytics: true,
      };
    default:
      return {
        can_manage_users: false,
        can_manage_forms: false,
        can_create_inspections: false,
        can_view_inspections: false,
        can_review_inspections: false,
        can_approve_inspections: false,
        can_reject_inspections: false,
        can_view_pending_inspections: false,
        can_view_analytics: false,
      };
  }
}

// Export with RBAC middleware - only admins can manage users
export default withRBAC(handler, {
  requiredPermission: 'can_manage_users',
});
