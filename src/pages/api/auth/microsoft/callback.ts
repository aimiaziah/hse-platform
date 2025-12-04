// API route to handle Microsoft OAuth callback
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  exchangeCodeForToken,
  getMicrosoftUserInfo,
  mapMicrosoftUserToRole,
} from '@/utils/microsoft-auth';
import { getServiceSupabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { generateToken } from '@/lib/jwt';
import { isEmailDomainAllowed, isAuthMethodEnabled } from '@/lib/auth-config';
import { rateLimitMiddleware, resetRateLimit } from '@/lib/rate-limiter';
import { serialize } from 'cookie';

type UserRow = Database['public']['Tables']['users']['Row'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if Microsoft auth is enabled
  if (!isAuthMethodEnabled('microsoft')) {
    return res.redirect('/login?error=Microsoft authentication is disabled');
  }

  // Apply rate limiting
  if (rateLimitMiddleware(req, res, 'microsoft-oauth')) {
    return; // Response already sent by middleware
  }

  try {
    const { code, error, error_description } = req.query;

    // Handle OAuth errors
    if (error) {
      console.error('Microsoft OAuth error:', error, error_description);
      return res.redirect(
        `/login?error=${encodeURIComponent(
          (error_description as string) || 'Authentication failed',
        )}`,
      );
    }

    if (!code || typeof code !== 'string') {
      return res.redirect('/login?error=No authorization code received');
    }

    // Exchange code for access token
    const { accessToken, refreshToken, expiresIn } = await exchangeCodeForToken(code);

    // Get user information from Microsoft Graph
    const userInfo = await getMicrosoftUserInfo(accessToken);

    // Validate email domain
    if (!isEmailDomainAllowed(userInfo.mail)) {
      console.warn(`Login attempt from unauthorized domain: ${userInfo.mail}`);
      return res.redirect(
        `/login?error=${encodeURIComponent(
          'Your email domain is not authorized. Please contact your administrator.',
        )}`,
      );
    }

    // Map user to app role
    const role = mapMicrosoftUserToRole(userInfo);

    // Check if user exists in database
    const supabase = getServiceSupabase();

    let user;
    const { data: existingUser, error: fetchError } = (await supabase
      .from('users')
      .select('*')
      .eq('email', userInfo.mail)
      .single()) as { data: UserRow | null; error: any };

    if (existingUser) {
      // Update existing user
      const { data: updatedUser, error: updateError } = await (supabase.from('users') as any)
        .update({
          name: userInfo.displayName,
          microsoft_id: userInfo.id,
          microsoft_access_token: accessToken,
          microsoft_refresh_token: refreshToken,
          microsoft_token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
          last_login: new Date().toISOString(),
        })
        .eq('id', existingUser.id)
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
        .single();

      if (updateError) {
        throw updateError;
      }

      user = updatedUser;
    } else {
      // Create new user with Microsoft account
      // NO automatic PIN generation - Microsoft users can only login via Microsoft
      const { data: newUser, error: createError } = await (supabase.from('users') as any)
        .insert([
          {
            name: userInfo.displayName,
            email: userInfo.mail,
            pin: null, // No PIN for Microsoft-only users
            role,
            microsoft_id: userInfo.id,
            microsoft_access_token: accessToken,
            microsoft_refresh_token: refreshToken,
            microsoft_token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
            is_active: true,
          },
        ])
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
        .single();

      if (createError) {
        throw createError;
      }

      user = newUser;
    }

    // Extract permissions
    const permissions = user.user_permissions || {};

    // Generate JWT token
    const jwtToken = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
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

    // Log successful login to audit trail
    await (supabase.from('audit_trail') as any).insert({
      user_id: user.id,
      user_name: user.name,
      user_role: user.role,
      action: 'LOGIN',
      entity_type: 'user',
      entity_id: user.id,
      description: 'User logged in successfully via Microsoft OAuth',
      timestamp: new Date().toISOString(),
    });

    // Reset rate limit on successful login
    resetRateLimit(req, 'microsoft-oauth');

    // Set auth token cookie with consistent naming
    const cookie = serialize('auth-token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    res.setHeader('Set-Cookie', cookie);

    // Redirect to analytics page with success message
    return res.redirect('/analytics?login=success');
  } catch (error) {
    console.error('Microsoft OAuth callback error:', error);
    return res.redirect(
      `/login?error=${encodeURIComponent(
        error instanceof Error ? error.message : 'Authentication failed',
      )}`,
    );
  }
}
