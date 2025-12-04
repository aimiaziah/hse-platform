// src/pages/api/auth/login.ts - User Login API
import { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '@/lib/supabase';
import { serialize } from 'cookie';
import { generateToken } from '@/lib/jwt';
import { isAuthMethodEnabled } from '@/lib/auth-config';
import { rateLimitMiddleware, resetRateLimit } from '@/lib/rate-limiter';
import { validateBody, LoginSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';

interface LoginRequest {
  pin: string;
}

interface LoginResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    signature?: string | null;
    permissions: any;
  };
  token?: string;
  error?: string;
  details?: Array<{ field: string; message: string }>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<LoginResponse>) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Check if PIN auth is enabled
  if (!isAuthMethodEnabled('pin')) {
    return res.status(403).json({
      success: false,
      error: 'PIN authentication is disabled. Please use Microsoft login.',
    });
  }

  // Apply rate limiting
  if (rateLimitMiddleware(req, res, 'pin-login')) {
    return; // Response already sent by middleware
  }

  try {
    // ✅ SECURITY: Validate input with Zod schema
    const validation = validateBody(LoginSchema, req.body);

    if (!validation.success) {
      logger.warn('Login validation failed', {
        ip: req.socket.remoteAddress,
        details: validation.details,
      });

      return res.status(400).json({
        success: false,
        error: validation.error,
        details: validation.details,
      });
    }

    const { pin } = validation.data;

    const supabase = getServiceSupabase();

    // Find user with matching PIN
    const { data: users, error: fetchError } = await supabase
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
      .eq('pin', pin)
      .eq('is_active', true);

    if (fetchError) {
      logger.error('Database error during login', fetchError, {
        ip: req.socket.remoteAddress,
      });
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }

    // Check if user found
    if (!users || users.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid PIN or user not found' });
    }

    const user = users[0] as any;

    // Fix: user_permissions is an object, not an array
    const permissions = user.user_permissions || {};

    // Update last login
    await (supabase.from('users') as any)
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Generate JWT token
    const token = generateToken({
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
      authMethod: 'pin',
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
    await (supabase.from('audit_trail') as any).insert({
      user_id: user.id,
      user_name: user.name,
      user_role: user.role,
      action: 'LOGIN',
      entity_type: 'user',
      entity_id: user.id,
      description: 'User logged in successfully via PIN',
      timestamp: new Date().toISOString(),
    });

    // Reset rate limit on successful login
    resetRateLimit(req, 'pin-login');

    // Prepare user response
    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      signature: user.signature || null,
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
      token,
    });
  } catch (error) {
    logger.error('Login error', error, {
      ip: req.socket.remoteAddress,
    });
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
