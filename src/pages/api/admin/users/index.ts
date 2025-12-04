// src/pages/api/admin/users/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { withRBAC, getRolePermissions } from '@/lib/rbac';
import { User } from '@/hooks/useAuth';
import { getServiceSupabase } from '@/lib/supabase';
import { validateBody, validateQuery, UserCreateSchema, ListQuerySchema } from '@/lib/validation';
import { logger } from '@/lib/logger';

async function handler(req: NextApiRequest, res: NextApiResponse, user: User) {
  if (req.method === 'GET') {
    return getUsers(req, res);
  }
  if (req.method === 'POST') {
    return createUser(req, res, user);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

// GET /api/admin/users - List all users with filters
async function getUsers(req: NextApiRequest, res: NextApiResponse) {
  // Validate query parameters
  const validation = validateQuery(ListQuerySchema, req.query);
  if (!validation.success) {
    logger.warn('Invalid query parameters', { errors: validation.details });
    return res.status(400).json(validation);
  }

  const { role, status, search, page, limit } = validation.data;
  // Assert types after validation (Zod transforms ensure these are numbers)
  const pageNum = page as number;
  const limitNum = limit as number;

  try {
    const supabase = getServiceSupabase();

    // Build query
    let query = supabase
      .from('users')
      .select('*, user_permissions(*)', { count: 'exact' });

    // Filter by role
    if (role) {
      query = query.eq('role', role);
    }

    // Filter by status
    if (status) {
      query = query.eq('is_active', status === 'active');
    }

    // Search by name
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // Pagination
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum - 1;

    query = query.range(startIndex, endIndex).order('created_at', { ascending: false });

    const { data: users, error, count } = await query;

    if (error) {
      logger.error('Get users error', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    // Format response with all necessary fields
    const sanitizedUsers = (users || []).map((u: any) => {
      const permissions = u.user_permissions?.[0] || {};
      return {
        id: u.id,
        name: u.name,
        role: u.role,
        email: u.email,
        pin: u.pin, // Include PIN for display in user management
        isActive: u.is_active,
        createdAt: u.created_at,
        lastLogin: u.last_login,
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
    });

    return res.status(200).json({
      users: sanitizedUsers,
      total: count || 0,
      page: pageNum,
      totalPages: Math.ceil((count || 0) / limitNum),
    });
  } catch (error) {
    logger.error('Get users error', error as Error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}

// POST /api/admin/users - Create new user
async function createUser(req: NextApiRequest, res: NextApiResponse, adminUser: User) {
  // Validate request body
  const validation = validateBody(UserCreateSchema, req.body);
  if (!validation.success) {
    logger.warn('User creation validation failed', { errors: validation.details, adminUser: adminUser.id });
    return res.status(400).json(validation);
  }

  const { name, role, pin, email, isActive } = validation.data;

  try {

    const supabase = getServiceSupabase();

    // Use provided PIN (already validated by schema)
    const userPin = pin;

    // Use provided email or create one from name
    const userEmail = email || `${name.toLowerCase().replace(/\s+/g, '.')}@inspection.local`;

    // Get default permissions for role
    const permissions = getRolePermissions(role);

    // Create user in database
    const { data: newUser, error: userError } = await (supabase
      .from('users') as any)
      .insert({
        name,
        pin: userPin,
        role,
        email: userEmail,
        is_active: isActive ?? true,
      })
      .select()
      .single();

    if (userError) {
      logger.error('Create user error', userError, { adminUser: adminUser.id });
      return res.status(500).json({ error: 'Failed to create user' });
    }

    logger.info('User created', { userId: newUser.id, role: newUser.role, createdBy: adminUser.id });

    // Create user permissions
    const { error: permError } = await (supabase
      .from('user_permissions') as any)
      .insert({
        user_id: newUser.id,
        can_manage_users: permissions.canManageUsers || false,
        can_manage_forms: permissions.canManageForms || false,
        can_create_inspections: permissions.canCreateInspections || false,
        can_view_inspections: permissions.canViewInspections || false,
        can_review_inspections: permissions.canReviewInspections || false,
        can_approve_inspections: permissions.canApproveInspections || false,
        can_reject_inspections: permissions.canRejectInspections || false,
        can_view_pending_inspections: permissions.canViewPendingInspections || false,
        can_view_analytics: permissions.canViewAnalytics || false,
      });

    if (permError) {
      logger.error('Create permissions error', permError, { userId: newUser.id });
      // Rollback user creation
      await (supabase.from('users') as any).delete().eq('id', newUser.id);
      return res.status(500).json({ error: 'Failed to create user permissions' });
    }

    // Log user creation to audit trail
    await (supabase.from('audit_trail') as any).insert({
      user_id: adminUser.id,
      user_name: adminUser.name,
      user_role: adminUser.role,
      action: 'USER_CREATED',
      entity_type: 'user',
      entity_id: newUser.id,
      description: `Created user ${newUser.name} with role ${newUser.role}`,
      timestamp: new Date().toISOString(),
    });

    return res.status(201).json({
      user: {
        id: newUser.id,
        name: newUser.name,
        role: newUser.role,
        email: newUser.email,
        isActive: newUser.is_active,
        createdAt: newUser.created_at,
        permissions,
      },
      tempPIN: userPin, // Send PIN once for display
      message: 'User created successfully',
    });
  } catch (error) {
    logger.error('Create user error', error as Error, { adminUser: adminUser.id });
    return res.status(500).json({ error: 'Failed to create user' });
  }
}

// Export with RBAC protection - Only admins can manage users
export default withRBAC(handler, {
  requiredRole: 'admin',
  requiredPermission: 'canManageUsers',
});
