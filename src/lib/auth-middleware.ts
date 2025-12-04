// Authentication Middleware for API Routes
import { NextApiRequest, NextApiResponse } from 'next';
import { parse } from 'cookie';
import { verifyToken, JWTPayload } from './jwt';
import { UserRole } from '@/hooks/useAuth';

/**
 * Extended request type with authenticated user
 */
export interface AuthenticatedRequest extends NextApiRequest {
  user?: JWTPayload;
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export function authenticate(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
      // Extract token from cookie
      const cookies = parse(req.headers.cookie || '');
      const token = cookies['auth-token'];

      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      // Verify token
      const payload = verifyToken(token);

      if (!payload) {
        // Clear invalid cookie
        res.setHeader(
          'Set-Cookie',
          'auth-token=; Path=/; HttpOnly; Max-Age=0'
        );

        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token. Please login again.',
        });
      }

      // Attach user to request
      req.user = payload;

      // Call the actual handler
      return handler(req, res);
    } catch (error) {
      console.error('Authentication middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  };
}

/**
 * Role-based authorization middleware
 * Requires authentication first
 */
export function requireRole(
  allowedRoles: UserRole[],
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void> | void
) {
  return authenticate(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to access this resource',
      });
    }

    return handler(req, res);
  });
}

/**
 * Permission-based authorization middleware
 * Requires authentication first
 */
export function requirePermission(
  permission: keyof JWTPayload['permissions'],
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void> | void
) {
  return authenticate(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!user.permissions[permission]) {
      return res.status(403).json({
        success: false,
        error: `You do not have the required permission: ${permission}`,
      });
    }

    return handler(req, res);
  });
}

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't block if not
 */
export function optionalAuthenticate(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
      // Extract token from cookie
      const cookies = parse(req.headers.cookie || '');
      const token = cookies['auth-token'];

      if (token) {
        // Verify token
        const payload = verifyToken(token);

        if (payload) {
          // Attach user to request if valid
          req.user = payload;
        }
      }

      // Call the actual handler regardless of auth status
      return handler(req, res);
    } catch (error) {
      console.error('Optional authentication middleware error:', error);
      // Continue to handler even if auth check fails
      return handler(req, res);
    }
  };
}

/**
 * Get current user from request
 * Use this in handlers that have been wrapped with authentication middleware
 */
export function getCurrentUser(req: AuthenticatedRequest): JWTPayload | null {
  return req.user || null;
}
