/**
 * Security Features Usage Examples
 *
 * This file contains practical examples of using the new security features.
 * Copy and adapt these patterns for your API routes and components.
 */

// ============================================================================
// EXAMPLE 1: Protected API Route with CORS, Rate Limiting, and Logging
// ============================================================================

import { NextApiRequest, NextApiResponse } from 'next';
import { withCors } from '@/lib/cors';
import { rateLimitMiddleware } from '@/lib/rate-limiter-redis';
import { logger } from '@/lib/logger';
import { authenticate, AuthenticatedRequest } from '@/lib/auth-middleware';

// Basic protected API route
export const protectedApiRoute = authenticate(async (req, res) => {
  logger.logRequest(req.method!, req.url || '');

  try {
    const user = req.user;
    logger.info('Processing request for user', { userId: user?.userId });

    // Your business logic here

    res.json({ success: true, data: 'response' });
  } catch (error) {
    logger.logApiError(req.url || '', 500, error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

// ============================================================================
// EXAMPLE 2: Public API Route with Rate Limiting and CORS
// ============================================================================

async function publicApiHandler(req: NextApiRequest, res: NextApiResponse) {
  // Apply rate limiting first
  if (await rateLimitMiddleware(req, res, 'public-api')) {
    return; // Rate limited, response already sent
  }

  logger.logRequest(req.method!, req.url || '', {
    ip: req.socket.remoteAddress,
  });

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Your public API logic
    const data = { message: 'Public data' };

    logger.info('Public API accessed', { endpoint: req.url });
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Public API error', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
}

// Apply CORS protection
export const publicApiWithCors = withCors(publicApiHandler);

// ============================================================================
// EXAMPLE 3: Login Endpoint with Security Logging
// ============================================================================

export async function loginHandler(req: NextApiRequest, res: NextApiResponse) {
  // Rate limiting
  if (await rateLimitMiddleware(req, res, 'login')) {
    // Log security event
    logger.security('RATE_LIMIT_EXCEEDED_LOGIN', {
      ip: req.socket.remoteAddress,
      attempts: 'exceeded',
    });
    return;
  }

  const { pin } = req.body;

  // Validate input (sensitive data automatically redacted in logs)
  logger.debug('Login attempt', { pin, ip: req.socket.remoteAddress });

  try {
    // Authenticate user
    const user = await authenticateUser(pin);

    if (!user) {
      // Log failed login
      logger.logAuth('login_failed', 'unknown', {
        reason: 'invalid_credentials',
        ip: req.socket.remoteAddress,
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Log successful login
    logger.logAuth('login', user.id, {
      method: 'pin',
      ip: req.socket.remoteAddress,
    });

    // Generate token and respond
    const token = generateToken(user);

    res.json({ success: true, token, user });
  } catch (error) {
    logger.logApiError('/api/auth/login', 500, error, {
      ip: req.socket.remoteAddress,
    });

    res.status(500).json({ success: false, error: 'Internal error' });
  }
}

// ============================================================================
// EXAMPLE 4: Database Operation with Logging
// ============================================================================

export async function databaseOperation() {
  try {
    logger.logDatabase('INSERT', 'inspections', {
      action: 'create_inspection',
    });

    // Perform database operation
    const result = await db.inspections.create({
      // ... data
    });

    logger.info('Inspection created successfully', {
      inspectionId: result.id,
    });

    return result;
  } catch (error) {
    logger.error('Failed to create inspection', error, {
      operation: 'database_insert',
    });
    throw error;
  }
}

// ============================================================================
// EXAMPLE 5: Security Event Logging
// ============================================================================

export function logSecurityEvents() {
  // Unauthorized access attempt
  logger.security('UNAUTHORIZED_ACCESS_ATTEMPT', {
    endpoint: '/admin/users',
    userId: 'user123',
    requiredRole: 'admin',
    actualRole: 'inspector',
  });

  // Suspicious activity
  logger.security('SUSPICIOUS_ACTIVITY', {
    userId: 'user456',
    action: 'multiple_failed_exports',
    count: 10,
    timeWindow: '5 minutes',
  });

  // Data access violation
  logger.security('DATA_ACCESS_VIOLATION', {
    userId: 'user789',
    attemptedResource: 'inspection-123',
    reason: 'not_owner',
  });

  // Permission escalation attempt
  logger.security('PERMISSION_ESCALATION_ATTEMPT', {
    userId: 'user101',
    currentRole: 'employee',
    attemptedAction: 'delete_user',
  });
}

// ============================================================================
// EXAMPLE 6: Structured Error Handling
// ============================================================================

export async function structuredErrorHandling(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    // Business logic that might throw
    await riskyOperation();
  } catch (error) {
    // Different error handling based on error type
    if (error instanceof ValidationError) {
      logger.warn('Validation error', {
        endpoint: req.url,
        errorType: 'validation',
        details: error.message,
      });

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details,
      });
    }

    if (error instanceof AuthorizationError) {
      logger.security('AUTHORIZATION_ERROR', {
        endpoint: req.url,
        userId: req.user?.userId,
        reason: error.message,
      });

      return res.status(403).json({
        success: false,
        error: 'Forbidden',
      });
    }

    // Unknown error - log with full context
    logger.error('Unexpected error', error, {
      endpoint: req.url,
      method: req.method,
      userId: req.user?.userId,
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

// ============================================================================
// EXAMPLE 7: Custom Rate Limiting for Different Endpoints
// ============================================================================

export async function customRateLimiting(req: NextApiRequest, res: NextApiResponse) {
  // Different rate limits for different endpoints
  const endpoint = req.url || '';

  let rateLimitPrefix: string;
  if (endpoint.includes('/auth/')) {
    rateLimitPrefix = 'auth'; // 5 requests per 15 min
  } else if (endpoint.includes('/export/')) {
    rateLimitPrefix = 'export'; // Different limit
  } else {
    rateLimitPrefix = 'api'; // General API limit
  }

  if (await rateLimitMiddleware(req, res, rateLimitPrefix)) {
    return;
  }

  // Continue with request handling
  res.json({ success: true });
}

// ============================================================================
// Helper Functions (for examples)
// ============================================================================

class ValidationError extends Error {
  details: any;
  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

async function authenticateUser(pin: string): Promise<any | null> {
  // Mock implementation
  return null;
}

function generateToken(user: any): string {
  // Mock implementation
  return 'token';
}

async function riskyOperation(): Promise<void> {
  // Mock implementation
}

const db = {
  inspections: {
    create: async (data: any) => ({ id: '123' }),
  },
};

// ============================================================================
// USAGE SUMMARY
// ============================================================================

/*

1. LOGGING:
   - Replace console.log with logger.info/debug/warn/error
   - Use logger.security() for security events
   - Sensitive data (pin, token, password) is automatically redacted

2. RATE LIMITING:
   - Add to all public APIs: await rateLimitMiddleware(req, res, 'prefix')
   - Different prefixes = different rate limits
   - Automatically uses Redis in production, memory in dev

3. CORS PROTECTION:
   - Wrap handlers with: export default withCors(handler)
   - Configure allowed origins in src/lib/cors.ts
   - Automatically handles OPTIONS requests

4. AUTHENTICATION:
   - Use existing middleware: authenticate() or requireRole()
   - User info available in req.user
   - Logs are automatically enriched with user context

5. ERROR HANDLING:
   - Use try/catch blocks
   - Log errors with logger.error() or logger.logApiError()
   - Never expose internal errors to users

*/
