// src/lib/rbac.ts - Role-Based Access Control utilities
import { NextApiRequest, NextApiResponse } from 'next';
import { User, UserRole } from '@/hooks/useAuth';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/jwt';

export interface RBACOptions {
  requiredRole?: UserRole | UserRole[];
  requiredPermission?: keyof User['permissions'] | Array<keyof User['permissions']>;
  requireAll?: boolean; // If true, user must have ALL permissions. If false, user needs ANY permission
}

/**
 * RBAC Middleware for API routes
 * Validates user authentication and authorization
 */
export function withRBAC(
  handler: (req: NextApiRequest, res: NextApiResponse, user: User) => Promise<void> | void,
  options: RBACOptions = {},
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // 1. Extract auth token from cookies or headers
      const authToken =
        req.cookies['auth-token'] || req.headers.authorization?.replace('Bearer ', '');

      if (!authToken) {
        return res.status(401).json({ error: 'Unauthorized - No auth token provided' });
      }

      // 2. Validate token and get user
      const user = await validateAuthToken(authToken);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized - Invalid or expired token' });
      }

      // 3. Check if user is active
      if (!user.isActive) {
        return res.status(403).json({ error: 'Forbidden - User account is deactivated' });
      }

      // 4. Allow users to update their own signature without admin permissions
      const isSignatureOnlyUpdate =
        req.method === 'PUT' &&
        req.query.id === user.id &&
        req.body &&
        req.body.signature !== undefined &&
        Object.keys(req.body).length === 1;

      if (isSignatureOnlyUpdate) {
        // Skip permission checks for signature-only self-updates
        return await handler(req, res, user);
      }

      // 5. Check role-based access
      if (options.requiredRole) {
        const roles = Array.isArray(options.requiredRole)
          ? options.requiredRole
          : [options.requiredRole];
        if (!roles.includes(user.role)) {
          return res.status(403).json({
            error: 'Forbidden - Insufficient role permissions',
            required: roles,
            current: user.role,
          });
        }
      }

      // 6. Check permission-based access
      if (options.requiredPermission) {
        const permissions = Array.isArray(options.requiredPermission)
          ? options.requiredPermission
          : [options.requiredPermission];

        const hasPermission = options.requireAll
          ? permissions.every((perm) => user.permissions[perm])
          : permissions.some((perm) => user.permissions[perm]);

        if (!hasPermission) {
          return res.status(403).json({
            error: 'Forbidden - Insufficient permissions',
            required: permissions,
          });
        }
      }

      // 7. Log access for audit trail
      await logAccess(user, req);

      // 8. Call the actual handler with authenticated user
      return await handler(req, res, user);
    } catch (error) {
      console.error('RBAC Middleware Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Validate auth token and return user
 */
async function validateAuthToken(token: string): Promise<User | null> {
  try {
    // Verify JWT token first
    const decoded = verifyToken(token);
    if (!decoded) {
      console.error('Invalid or expired JWT token');
      return null;
    }

    // Extract user ID from token
    const { userId } = decoded;
    if (!userId) {
      console.error('No userId in JWT token');
      return null;
    }

    const supabase = getServiceSupabase();

    const { data: users, error } = await supabase
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
      .eq('id', userId)
      .eq('is_active', true);

    if (error || !users || users.length === 0) {
      console.error('User not found or inactive:', error);
      return null;
    }

    const user = users[0] as any;

    // Fix: user_permissions is an object, not an array (same issue as login.ts)
    const permissions = user.user_permissions || {};

    console.log('=== RBAC TOKEN VALIDATION ===');
    console.log('User ID:', user.id);
    console.log('Raw permissions:', user.user_permissions);
    console.log('Extracted permissions:', permissions);
    console.log('can_view_analytics:', permissions.can_view_analytics);
    console.log('=============================');

    return {
      id: user.id,
      name: user.name,
      pin: user.pin,
      role: user.role,
      isActive: user.is_active,
      createdAt: user.created_at,
      lastLogin: user.last_login,
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
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
}

/**
 * Log access for audit trail
 */
async function logAccess(user: User, req: NextApiRequest): Promise<void> {
  try {
    const supabase = getServiceSupabase();

    await supabase.from('audit_trail').insert({
      user_id: user.id,
      user_name: user.name,
      user_role: user.role,
      action: 'API_ACCESS',
      entity_type: 'api',
      entity_id: req.url || '',
      description: `${req.method} ${req.url}`,
      timestamp: new Date().toISOString(),
    } as any);
  } catch (error) {
    console.error('Failed to log access:', error);
    // Don't fail the request if logging fails
  }
}

/**
 * Check if user has specific permission
 */
export function checkPermission(user: User, permission: keyof User['permissions']): boolean {
  return user.permissions[permission] || false;
}

/**
 * Check if user has specific role
 */
export function checkRole(user: User, role: UserRole | UserRole[]): boolean {
  const roles = Array.isArray(role) ? role : [role];
  return roles.includes(user.role);
}

/**
 * Get role permissions template
 */
export function getRolePermissions(role: UserRole): User['permissions'] {
  switch (role) {
    case 'admin':
      return {
        // Admin has ALL permissions
        canManageUsers: true,
        canManageForms: true,
        canCreateInspections: true,
        canViewInspections: true,
        canReviewInspections: true,
        canApproveInspections: true,
        canRejectInspections: true,
        canViewPendingInspections: true,
        canViewAnalytics: true,
      };

    case 'inspector':
      return {
        // Admin permissions
        canManageUsers: false,
        canManageForms: false,

        // Inspector permissions - Conduct Inspections
        canCreateInspections: true,
        canViewInspections: true,

        // Supervisor permissions
        canReviewInspections: false,
        canApproveInspections: false,
        canRejectInspections: false,
        canViewPendingInspections: false,

        // Employee permissions
        canViewAnalytics: true,
      };

    case 'supervisor':
      return {
        // Admin permissions
        canManageUsers: false,
        canManageForms: false,

        // Inspector permissions
        canCreateInspections: false,
        canViewInspections: true,

        // Supervisor permissions - Approve/Reject Inspections
        canReviewInspections: true,
        canApproveInspections: true,
        canRejectInspections: true,
        canViewPendingInspections: true,

        // Employee permissions
        canViewAnalytics: true,
      };

    case 'employee':
      return {
        // Admin permissions
        canManageUsers: false,
        canManageForms: false,

        // Inspector permissions
        canCreateInspections: false,
        canViewInspections: false,

        // Supervisor permissions
        canReviewInspections: false,
        canApproveInspections: false,
        canRejectInspections: false,
        canViewPendingInspections: false,

        // Employee permissions - View Analytics Only
        canViewAnalytics: true,
      };

    default:
      // Default: no permissions
      return {
        canManageUsers: false,
        canManageForms: false,
        canCreateInspections: false,
        canViewInspections: false,
        canReviewInspections: false,
        canApproveInspections: false,
        canRejectInspections: false,
        canViewPendingInspections: false,
        canViewAnalytics: false,
      };
  }
}
