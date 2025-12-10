// Microsoft OAuth Callback Handler
// Handles the redirect from Microsoft after user authenticates
import { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'cookie';
import {
  exchangeCodeForToken,
  getMicrosoftUserInfo,
  mapMicrosoftUserToRole,
} from '@/utils/microsoft-auth';
import { generateToken } from '@/lib/jwt';
import { getServiceSupabase, logAuditTrail } from '@/lib/supabase';
import { isAuthMethodEnabled, isEmailDomainAllowed } from '@/lib/auth-config';
import { rateLimitMiddleware, resetRateLimit } from '@/lib/rate-limiter';
import { getRolePermissions } from '@/lib/rbac';
import { logger } from '@/lib/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests (OAuth callback)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if Microsoft auth is enabled
  if (!isAuthMethodEnabled('microsoft')) {
    return res.redirect(
      `/login?error=${encodeURIComponent('Microsoft authentication is disabled')}`,
    );
  }

  // Apply rate limiting
  if (rateLimitMiddleware(req, res, 'microsoft-login')) {
    return; // Response already sent by middleware
  }

  try {
    const { code, error: oauthError, error_description } = req.query;

    // Check for OAuth errors
    if (oauthError) {
      logger.warn('Microsoft OAuth error', {
        error: oauthError,
        description: error_description,
        ip: req.socket.remoteAddress,
      });

      let errorMessage = 'Authentication failed';
      if (oauthError === 'access_denied') {
        errorMessage = 'Access was denied. Please try again.';
      } else if (oauthError === 'invalid_request') {
        errorMessage = 'Invalid authentication request. Please try again.';
      }

      return res.redirect(`/login?error=${encodeURIComponent(errorMessage)}`);
    }

    // Validate authorization code
    if (!code || typeof code !== 'string') {
      logger.warn('Missing authorization code', {
        ip: req.socket.remoteAddress,
      });
      return res.redirect(
        `/login?error=${encodeURIComponent('Missing authorization code')}`,
      );
    }

    // Exchange authorization code for tokens
    let tokens;
    try {
      tokens = await exchangeCodeForToken(code);
    } catch (error) {
      logger.error('Token exchange failed', error as Error, {
        ip: req.socket.remoteAddress,
      });
      return res.redirect(
        `/login?error=${encodeURIComponent('Failed to exchange authorization code')}`,
      );
    }

    // Get user information from Microsoft Graph
    let userInfo;
    try {
      userInfo = await getMicrosoftUserInfo(tokens.accessToken);
    } catch (error) {
      logger.error('Failed to get user info', error as Error, {
        ip: req.socket.remoteAddress,
      });
      return res.redirect(
        `/login?error=${encodeURIComponent('Failed to retrieve user information')}`,
      );
    }

    // Validate email domain whitelist
    if (!isEmailDomainAllowed(userInfo.mail)) {
      logger.warn('Email domain not allowed', {
        email: userInfo.mail,
        ip: req.socket.remoteAddress,
      });
      return res.redirect(
        `/login?error=${encodeURIComponent('Your email domain is not authorized to access this application')}`,
      );
    }

    const supabase = getServiceSupabase();

    // Check if user already exists (by Microsoft ID or email)
    const { data: existingUsers, error: fetchError } = await supabase
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
      .or(`microsoft_id.eq.${userInfo.id},email.eq.${userInfo.mail}`)
      .eq('is_active', true)
      .limit(1);

    if (fetchError) {
      logger.error('Database error during Microsoft login', fetchError, {
        ip: req.socket.remoteAddress,
      });
      return res.redirect(
        `/login?error=${encodeURIComponent('Database error. Please try again.')}`,
      );
    }

    let user: any;
    let isNewUser = false;

    if (existingUsers && existingUsers.length > 0) {
      // Existing user - update tokens and last login
      user = existingUsers[0];
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + tokens.expiresIn);

      const { error: updateError } = await (supabase.from('users') as any)
        .update({
          microsoft_access_token: tokens.accessToken,
          microsoft_refresh_token: tokens.refreshToken,
          microsoft_token_expires_at: tokenExpiresAt.toISOString(),
          last_login: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        logger.error('Failed to update user tokens', updateError, {
          userId: user.id,
        });
        // Continue anyway - user can still login
      }
    } else {
      // New user - create account
      isNewUser = true;
      const role = mapMicrosoftUserToRole(userInfo);
      const permissions = getRolePermissions(role);

      // Calculate token expiration
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + tokens.expiresIn);

      // Create user in database
      const { data: newUser, error: createError } = await (supabase.from('users') as any)
        .insert({
          name: userInfo.displayName,
          email: userInfo.mail,
          microsoft_id: userInfo.id,
          microsoft_access_token: tokens.accessToken,
          microsoft_refresh_token: tokens.refreshToken,
          microsoft_token_expires_at: tokenExpiresAt.toISOString(),
          role,
          is_active: true,
          last_login: new Date().toISOString(),
          // Note: PIN is null for Microsoft-only users
        })
        .select()
        .single();

      if (createError) {
        logger.error('Failed to create user', createError, {
          email: userInfo.mail,
          ip: req.socket.remoteAddress,
        });
        return res.redirect(
          `/login?error=${encodeURIComponent('Failed to create user account')}`,
        );
      }

      user = newUser;

      // Create user permissions
      const { error: permError } = await (supabase.from('user_permissions') as any).insert({
        user_id: user.id,
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
        logger.error('Failed to create user permissions', permError, {
          userId: user.id,
        });
        // Rollback user creation
        await (supabase.from('users') as any).delete().eq('id', user.id);
        return res.redirect(
          `/login?error=${encodeURIComponent('Failed to create user permissions')}`,
        );
      }

      // Log user creation to audit trail
      await logAuditTrail({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'USER_CREATED',
        entityType: 'user',
        entityId: user.id,
        description: `Created user ${user.name} with role ${user.role} via Microsoft login`,
        ipAddress: req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestMethod: req.method,
        requestPath: req.url,
      });
    }

    // Get user permissions (for existing users)
    const userPermissions = user.user_permissions?.[0] || {};
    const permissions = {
      canManageUsers: userPermissions.can_manage_users || false,
      canManageForms: userPermissions.can_manage_forms || false,
      canCreateInspections: userPermissions.can_create_inspections || false,
      canViewInspections: userPermissions.can_view_inspections || false,
      canReviewInspections: userPermissions.can_review_inspections || false,
      canApproveInspections: userPermissions.can_approve_inspections || false,
      canRejectInspections: userPermissions.can_reject_inspections || false,
      canViewPendingInspections: userPermissions.can_view_pending_inspections || false,
      canViewAnalytics: userPermissions.can_view_analytics || false,
    };

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email || userInfo.mail,
      name: user.name || userInfo.displayName,
      role: user.role,
      permissions,
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

    // Log successful login to audit trail
    await logAuditTrail({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'LOGIN',
      entityType: 'user',
      entityId: user.id,
      description: `User logged in successfully via Microsoft${isNewUser ? ' (new user)' : ''}`,
      ipAddress: req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      requestMethod: req.method,
      requestPath: req.url,
    });

    // Reset rate limit on successful login
    resetRateLimit(req, 'microsoft-login');

    // Redirect to analytics dashboard (or home)
    return res.redirect('/analytics');
  } catch (error) {
    logger.error('Microsoft OAuth callback error', error as Error, {
      ip: req.socket.remoteAddress,
    });
    return res.redirect(
      `/login?error=${encodeURIComponent('An unexpected error occurred during authentication')}`,
    );
  }
}

