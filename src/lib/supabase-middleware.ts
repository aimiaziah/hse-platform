// src/lib/supabase-middleware.ts - RBAC Middleware for Supabase
import { NextApiRequest, NextApiResponse } from 'next';
import { parse } from 'cookie';
import { verifyToken } from '@/lib/jwt';
import { getServiceSupabase, logAuditTrail } from '@/lib/supabase';

export interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    name: string;
    pin: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    lastLogin?: string;
    permissions: Record<string, boolean>;
  };
}

export interface RBACOptions {
  requiredRole?: string | string[];
  requiredPermission?: string | string[];
  requireAll?: boolean;
}

/**
 * RBAC Middleware for API routes with Supabase
 */
export function withRBAC(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void> | void,
  options: RBACOptions = {},
) {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
      // 1. Extract auth token from cookies or headers
      // Parse cookies manually since Next.js doesn't auto-parse them
      const cookies = parse(req.headers.cookie || '');
      const authToken =
        cookies['auth-token'] ||
        req.cookies?.['auth-token'] ||
        req.headers.authorization?.replace('Bearer ', '');

      if (!authToken) {
        return res.status(401).json({ error: 'Unauthorized - No auth token provided' });
      }

      // 2. Verify JWT token and extract user ID
      const tokenPayload = verifyToken(authToken);
      if (!tokenPayload) {
        return res.status(401).json({ error: 'Unauthorized - Invalid or expired token' });
      }

      const { userId } = tokenPayload;

      // 3. Get user from Supabase
      const supabase = getServiceSupabase();
      const { data: user, error } = await supabase
        .from('v_users_with_permissions')
        .select('*')
        .eq('id', userId)
        .eq('is_active', true)
        .single();

      if (error || !user) {
        return res.status(401).json({ error: 'Unauthorized - Invalid or expired token' });
      }

      const userData = user as any;

      // 3. Check role-based access
      if (options.requiredRole) {
        const roles = Array.isArray(options.requiredRole)
          ? options.requiredRole
          : [options.requiredRole];
        if (!roles.includes(userData.role)) {
          return res.status(403).json({
            error: 'Forbidden - Insufficient role permissions',
            required: roles,
            current: userData.role,
          });
        }
      }

      // 4. Check permission-based access
      if (options.requiredPermission) {
        const permissions = Array.isArray(options.requiredPermission)
          ? options.requiredPermission
          : [options.requiredPermission];

        const hasPermission = options.requireAll
          ? permissions.every((perm) => userData[perm] === true)
          : permissions.some((perm) => userData[perm] === true);

        if (!hasPermission) {
          return res.status(403).json({
            error: 'Forbidden - Insufficient permissions',
            required: permissions,
          });
        }
      }

      // 5. Attach user to request
      req.user = {
        id: userData.id,
        name: userData.name,
        pin: userData.pin,
        role: userData.role,
        isActive: userData.is_active,
        createdAt: userData.created_at,
        lastLogin: userData.last_login,
        permissions: {
          canManageUsers: userData.can_manage_users || false,
          canManageForms: userData.can_manage_forms || false,
          canCreateInspections: userData.can_create_inspections || false,
          canViewInspections: userData.can_view_inspections || false,
          canReviewInspections: userData.can_review_inspections || false,
          canApproveInspections: userData.can_approve_inspections || false,
          canRejectInspections: userData.can_reject_inspections || false,
          canViewPendingInspections: userData.can_view_pending_inspections || false,
          canViewAnalytics: userData.can_view_analytics || false,
        },
      };

      // 6. Log access for audit trail
      await logAuditTrail({
        userId: userData.id,
        userName: userData.name,
        userRole: userData.role,
        action: 'API_ACCESS',
        entityType: 'api',
        description: `${req.method} ${req.url}`,
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestMethod: req.method,
        requestPath: req.url || '',
        severity: 'info',
      });

      // 7. Call the actual handler with authenticated user
      return await handler(req, res);
    } catch (error) {
      console.error('RBAC Middleware Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
