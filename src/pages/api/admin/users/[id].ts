// src/pages/api/admin/users/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { withRBAC, getRolePermissions } from '@/lib/rbac';
import { User } from '@/hooks/useAuth';
import { getServiceSupabase } from '@/lib/supabase';
import { validateBody, validateParams, UserUpdateSchema, UUIDSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';

async function handler(req: NextApiRequest, res: NextApiResponse, user: User) {
  const { id } = req.query;

  // Validate user ID parameter
  const validation = validateParams(UUIDSchema, id);
  if (!validation.success) {
    logger.warn('Invalid user ID parameter', { errors: validation.details });
    return res.status(400).json(validation);
  }

  const userId = validation.data;

  if (req.method === 'GET') {
    return getUser(req, res, userId);
  }
  if (req.method === 'PUT') {
    // Allow users to update their own signature without admin permissions
    const isUpdatingSelf = userId === user.id;
    const { signature, ...otherUpdates } = req.body;
    const hasOnlySignatureUpdate = signature !== undefined && Object.keys(otherUpdates).length === 0;

    if (isUpdatingSelf && hasOnlySignatureUpdate) {
      return updateUserSignature(req, res, userId);
    }

    return updateUser(req, res, userId, user);
  }
  if (req.method === 'DELETE') {
    return deactivateUser(req, res, userId, user);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

// GET /api/admin/users/[id] - Get single user
async function getUser(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const supabase = getServiceSupabase();

    const { data: user, error } = await supabase
      .from('users')
      .select(`
        *,
        user_permissions (*)
      `)
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const permissions = (user as any).user_permissions?.[0] || {};

    return res.status(200).json({
      user: {
        id: (user as any).id,
        name: (user as any).name,
        role: (user as any).role,
        email: (user as any).email,
        pin: (user as any).pin,
        isActive: (user as any).is_active,
        createdAt: (user as any).created_at,
        lastLogin: (user as any).last_login,
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
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
}

// PUT /api/admin/users/[id]/signature - Update user's own signature (no admin required)
async function updateUserSignature(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
) {
  const { signature } = req.body;

  try {
    const supabase = getServiceSupabase();

    // Update signature in database
    const { error: updateError } = await (supabase
      .from('users') as any)
      .update({
        signature,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Update signature error:', updateError);
      return res.status(500).json({ error: 'Failed to update signature' });
    }

    return res.status(200).json({
      message: 'Signature updated successfully',
    });
  } catch (error) {
    logger.error('Update signature error', error as Error, { userId });
    return res.status(500).json({ error: 'Failed to update signature' });
  }
}

// PUT /api/admin/users/[id] - Update user
async function updateUser(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  adminUser: User,
) {
  // Validate update data
  const validation = validateBody(UserUpdateSchema, req.body);
  if (!validation.success) {
    logger.warn('User update validation failed', { errors: validation.details, userId });
    return res.status(400).json(validation);
  }

  const { name, pin, role, isActive, signature } = validation.data;
  const { permissions } = req.body; // Permissions not in schema, handle separately

  try {
    const supabase = getServiceSupabase();

    // Get existing user
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existingUserData = existingUser as any;

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    // Update signature - Allow users to update their own signature
    if (signature !== undefined) {
      updates.signature = signature;
    }

    // Update name
    if (name && name !== existingUserData.name) {
      updates.name = name;
    }

    // Update PIN
    if (pin && pin !== existingUserData.pin) {
      updates.pin = pin;
    }

    // Update role (already validated by schema)
    if (role && role !== existingUserData.role) {
      updates.role = role;
    }

    // Update active status
    if (typeof isActive === 'boolean') {
      updates.is_active = isActive;
    }

    // Update user in database
    const { error: updateError } = await (supabase
      .from('users') as any)
      .update(updates)
      .eq('id', userId);

    if (updateError) {
      logger.error('Update user error', updateError, { userId, adminUser: adminUser.id });
      return res.status(500).json({ error: 'Failed to update user' });
    }

    logger.info('User updated', { userId, updatedBy: adminUser.id, fields: Object.keys(updates) });

    // Update permissions if role changed or custom permissions provided
    if (updates.role || permissions) {
      const newPermissions = updates.role
        ? getRolePermissions(updates.role)
        : permissions;

      const { error: permError } = await (supabase
        .from('user_permissions') as any)
        .update({
          can_manage_users: newPermissions.canManageUsers || false,
          can_manage_forms: newPermissions.canManageForms || false,
          can_create_inspections: newPermissions.canCreateInspections || false,
          can_view_inspections: newPermissions.canViewInspections || false,
          can_review_inspections: newPermissions.canReviewInspections || false,
          can_approve_inspections: newPermissions.canApproveInspections || false,
          can_reject_inspections: newPermissions.canRejectInspections || false,
          can_view_pending_inspections: newPermissions.canViewPendingInspections || false,
          can_view_analytics: newPermissions.canViewAnalytics || false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (permError) {
        logger.error('Update permissions error', permError, { userId });
      }
    }

    // Log update to audit trail
    await (supabase.from('audit_trail') as any).insert({
      user_id: adminUser.id,
      user_name: adminUser.name,
      user_role: adminUser.role,
      action: 'USER_UPDATED',
      entity_type: 'user',
      entity_id: userId,
      description: `Updated user ${existingUserData.name}`,
      old_values: existingUserData,
      new_values: updates,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      message: 'User updated successfully',
    });
  } catch (error) {
    logger.error('Update user error', error as Error, { userId, adminUser: adminUser.id });
    return res.status(500).json({ error: 'Failed to update user' });
  }
}

// DELETE /api/admin/users/[id] - Deactivate user (soft delete)
async function deactivateUser(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  adminUser: User,
) {
  try {
    // Prevent self-deactivation
    if (userId === adminUser.id) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    const supabase = getServiceSupabase();

    // Get user info before deactivating
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Deactivate user
    const { error: updateError } = await (supabase
      .from('users') as any)
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      logger.error('Deactivate user error', updateError, { userId, adminUser: adminUser.id });
      return res.status(500).json({ error: 'Failed to deactivate user' });
    }

    logger.security('USER_DEACTIVATED', { userId, deactivatedBy: adminUser.id, userName: (user as any).name });

    // Log deactivation to audit trail
    await (supabase.from('audit_trail') as any).insert({
      user_id: adminUser.id,
      user_name: adminUser.name,
      user_role: adminUser.role,
      action: 'USER_DEACTIVATED',
      entity_type: 'user',
      entity_id: userId,
      description: `Deactivated user ${(user as any).name}`,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      message: 'User deactivated successfully',
    });
  } catch (error) {
    logger.error('Deactivate user error', error as Error, { userId, adminUser: adminUser.id });
    return res.status(500).json({ error: 'Failed to deactivate user' });
  }
}

export default withRBAC(handler, {
  requiredRole: 'admin',
  requiredPermission: 'canManageUsers',
});
