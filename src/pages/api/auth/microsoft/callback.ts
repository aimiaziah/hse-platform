// src/pages/api/auth/microsoft/callback.ts - Microsoft OAuth Callback
import { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '@/lib/supabase';
import { serialize } from 'cookie';
import { generateToken } from '@/lib/jwt';
import {
  exchangeCodeForToken,
  getMicrosoftUserInfo,
  mapMicrosoftUserToRole,
} from '@/utils/microsoft-auth';
import { getRolePermissions } from '@/lib/rbac';
import { logger } from '@/lib/logger';
import { parseCookies } from '@/utils/pkce-helper';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, error, error_description } = req.query;

    // Handle OAuth errors from Microsoft
    if (error) {
      logger.error('Microsoft OAuth error', new Error(error as string), {
        error_description,
      });

      const errorMessage = error_description
        ? decodeURIComponent(error_description as string)
        : 'Microsoft login failed';

      return res.redirect(`/login?error=${encodeURIComponent(errorMessage)}`);
    }

    // Validate authorization code
    if (!code || typeof code !== 'string') {
      logger.warn('Missing authorization code in Microsoft callback');
      return res.redirect('/login?error=Missing+authorization+code');
    }

    // Retrieve PKCE code verifier from cookies
    const cookies = parseCookies(req.headers.cookie || '');
    const codeVerifier = cookies.pkce_verifier;

    // Get client secret from environment (server-side only, never exposed to client)
    const clientSecret =
      process.env.SHAREPOINT_CLIENT_SECRET || process.env.MICROSOFT_CLIENT_SECRET;

    // Exchange authorization code for access token (with PKCE and client secret if available)
    logger.info('Exchanging authorization code for token');
    const { accessToken, refreshToken, expiresIn } = await exchangeCodeForToken(
      code,
      codeVerifier,
      clientSecret,
    );

    // Clear PKCE cookie
    res.setHeader(
      'Set-Cookie',
      serialize('pkce_verifier', '', {
        httpOnly: true,
        expires: new Date(0),
        path: '/',
      }),
    );

    // Get user information from Microsoft Graph
    logger.info('Fetching user info from Microsoft Graph');
    const userInfo = await getMicrosoftUserInfo(accessToken);

    // Map user to role based on email whitelist
    const assignedRole = mapMicrosoftUserToRole(userInfo);

    logger.info('Microsoft user mapped to role', {
      email: userInfo.mail,
      role: assignedRole,
    });

    const supabase = getServiceSupabase();

    // Check if user exists by Microsoft ID or email
    const { data: existingUsersByMsId } = await supabase
      .from('users')
      .select('*')
      .eq('microsoft_id', userInfo.id);

    const { data: existingUsersByEmail } = await supabase
      .from('users')
      .select('*')
      .eq('email', userInfo.mail);

    let user: any;
    let isNewUser = false;

    // Determine which user record to use
    const existingUser = existingUsersByMsId?.[0] || existingUsersByEmail?.[0];

    if (existingUser) {
      // Update existing user (link Microsoft account if needed)
      user = existingUser;

      // Build update object (profile_picture is optional if column doesn't exist)
      const updateData: any = {
        email: userInfo.mail,
        name: userInfo.displayName,
        role: assignedRole, // Always update role based on current whitelist configuration
        microsoft_id: userInfo.id, // Link Microsoft account if not already linked
        microsoft_access_token: accessToken,
        microsoft_refresh_token: refreshToken,
        microsoft_token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Only include profile_picture if we have a URL (column may not exist yet)
      if (userInfo.profilePictureUrl) {
        updateData.profile_picture = userInfo.profilePictureUrl;
      }

      const { error: updateError } = await (supabase.from('users') as any)
        .update(updateData)
        .eq('id', user.id);

      if (updateError) {
        logger.error('Failed to update user', updateError);
        throw new Error('Failed to update user information');
      }

      // Update permissions if role changed
      if (existingUser.role !== assignedRole) {
        const rolePermissions = getRolePermissions(assignedRole);

        const { error: permUpdateError } = await (supabase.from('user_permissions') as any)
          .update({
            can_manage_users: rolePermissions.canManageUsers || false,
            can_manage_forms: rolePermissions.canManageForms || false,
            can_create_inspections: rolePermissions.canCreateInspections || false,
            can_view_inspections: rolePermissions.canViewInspections || false,
            can_review_inspections: rolePermissions.canReviewInspections || false,
            can_approve_inspections: rolePermissions.canApproveInspections || false,
            can_reject_inspections: rolePermissions.canRejectInspections || false,
            can_view_pending_inspections: rolePermissions.canViewPendingInspections || false,
            can_view_analytics: rolePermissions.canViewAnalytics || false,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (permUpdateError) {
          logger.error('Failed to update user permissions', permUpdateError);
        }

        logger.info('Updated user role and permissions', {
          userId: user.id,
          oldRole: existingUser.role,
          newRole: assignedRole,
        });
      }

      logger.info('Updated existing Microsoft user', {
        userId: user.id,
        linkedMicrosoftAccount: !existingUser.microsoft_id,
        roleUpdated: existingUser.role !== assignedRole,
      });
    } else {
      // Create new user
      isNewUser = true;

      // Build insert object (profile_picture is optional if column doesn't exist)
      const insertData: any = {
        email: userInfo.mail,
        name: userInfo.displayName,
        role: assignedRole,
        microsoft_id: userInfo.id,
        microsoft_access_token: accessToken,
        microsoft_refresh_token: refreshToken,
        microsoft_token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        is_active: true,
        last_login: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Only include profile_picture if we have a URL (column may not exist yet)
      if (userInfo.profilePictureUrl) {
        insertData.profile_picture = userInfo.profilePictureUrl;
      }

      const { data: newUser, error: createError } = await (supabase.from('users') as any)
        .insert(insertData)
        .select()
        .single();

      if (createError || !newUser) {
        logger.error('Failed to create user', createError);
        throw new Error('Failed to create user account');
      }

      user = newUser;

      // Create user permissions based on assigned role
      const rolePermissions = getRolePermissions(assignedRole);

      const { error: permError } = await (supabase.from('user_permissions') as any).insert({
        user_id: user.id,
        can_manage_users: rolePermissions.canManageUsers || false,
        can_manage_forms: rolePermissions.canManageForms || false,
        can_create_inspections: rolePermissions.canCreateInspections || false,
        can_view_inspections: rolePermissions.canViewInspections || false,
        can_review_inspections: rolePermissions.canReviewInspections || false,
        can_approve_inspections: rolePermissions.canApproveInspections || false,
        can_reject_inspections: rolePermissions.canRejectInspections || false,
        can_view_pending_inspections: rolePermissions.canViewPendingInspections || false,
        can_view_analytics: rolePermissions.canViewAnalytics || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (permError) {
        logger.error('Failed to create user permissions', permError);
      }

      logger.info('Created new Microsoft user', {
        userId: user.id,
        email: userInfo.mail,
        role: assignedRole,
      });
    }

    // Fetch user with permissions
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
      .eq('id', user.id)
      .single();

    if (fetchError || !userData) {
      logger.error('Failed to fetch user data', fetchError);
      throw new Error('Failed to retrieve user information');
    }

    const permissions = (userData as any).user_permissions || {};

    // Generate JWT token
    const token = generateToken({
      userId: userData.id,
      email: (userData as any).email,
      name: (userData as any).name,
      role: (userData as any).role,
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
      authMethod: 'microsoft',
    });

    // Set auth token cookie
    const cookie = serialize('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    res.setHeader('Set-Cookie', cookie);

    // Log to audit trail
    await (supabase.from('audit_trail') as any).insert({
      user_id: userData.id,
      user_name: (userData as any).name,
      user_role: (userData as any).role,
      action: isNewUser ? 'USER_CREATED' : 'LOGIN',
      entity_type: 'user',
      entity_id: userData.id,
      description: isNewUser
        ? `New user created via Microsoft login (${assignedRole})`
        : 'User logged in successfully via Microsoft',
      timestamp: new Date().toISOString(),
    });

    // Redirect to home page
    logger.info('Microsoft login successful', {
      userId: userData.id,
      role: (userData as any).role,
      isNewUser,
    });

    return res.redirect('/analytics?login=success');
  } catch (error) {
    logger.error('Microsoft callback error', error as Error);

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to complete Microsoft login';

    return res.redirect(`/login?error=${encodeURIComponent(errorMessage)}`);
  }
}
