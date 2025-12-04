// JWT Token Generation and Verification Utilities
import jwt, { SignOptions } from 'jsonwebtoken';
import { UserRole } from '@/hooks/useAuth';
import { env } from './env';
import { logger } from './logger';

// JWT Payload Interface
export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: {
    canManageUsers: boolean;
    canManageForms: boolean;
    canCreateInspections: boolean;
    canViewInspections: boolean;
    canReviewInspections: boolean;
    canApproveInspections: boolean;
    canRejectInspections: boolean;
    canViewPendingInspections: boolean;
    canViewAnalytics: boolean;
  };
  authMethod: 'pin' | 'microsoft';
  iat?: number;
  exp?: number;
}

/**
 * Get JWT secret from validated environment
 */
function getJWTSecret(): string {
  // ✅ SECURITY: Use validated environment variable
  // JWT operations should only happen server-side
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured. This should only be called on the server.');
  }
  return env.JWT_SECRET;
}

/**
 * Get JWT expiration time from environment (default: 7 days)
 */
function getJWTExpiresIn(): string {
  return env.JWT_EXPIRES_IN || '7d';
}

/**
 * Generate JWT token for a user
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  const secret = getJWTSecret();
  const expiresIn = getJWTExpiresIn();

  return jwt.sign(payload, secret, { expiresIn } as SignOptions);
}

/**
 * Verify and decode JWT token
 * Returns null if token is invalid or expired
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const secret = getJWTSecret();
    const decoded = jwt.verify(token, secret) as JWTPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('JWT verification failed', { message: error.message });
    } else if (error instanceof jwt.TokenExpiredError) {
      logger.info('JWT token expired', { message: error.message });
    } else {
      logger.error('JWT verification error', error);
    }
    return null;
  }
}

/**
 * Decode JWT token without verification (use for debugging only)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    logger.error('JWT decode error', error);
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return true;
  }

  return Date.now() >= decoded.exp * 1000;
}

/**
 * Get token expiration date
 */
export function getTokenExpiration(token: string): Date | null {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return null;
  }

  return new Date(decoded.exp * 1000);
}
