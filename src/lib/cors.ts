// CORS Middleware for API Routes
import { NextApiRequest, NextApiResponse } from 'next';

/**
 * CORS Configuration
 * Controls which origins can access your API
 */
const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:3000',
  // Add your production domains here
  process.env.NEXT_PUBLIC_APP_URL,
].filter(Boolean) as string[];

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'Accept',
  'Origin',
];

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;

  // In development, allow all localhost origins
  if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
    return true;
  }

  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Apply CORS headers to response
 */
export function applyCorsHeaders(
  req: NextApiRequest,
  res: NextApiResponse,
  options: {
    allowCredentials?: boolean;
    maxAge?: number;
  } = {}
): void {
  const origin = req.headers.origin;
  const { allowCredentials = true, maxAge = 86400 } = options;

  // Set CORS headers only for allowed origins
  if (isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin!);

    if (allowCredentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  }

  res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '));
  res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS.join(', '));
  res.setHeader('Access-Control-Max-Age', maxAge.toString());
}

/**
 * CORS Middleware wrapper for API routes
 * Automatically handles OPTIONS preflight requests
 */
export function withCors(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void,
  options?: {
    allowCredentials?: boolean;
    maxAge?: number;
  }
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Apply CORS headers
    applyCorsHeaders(req, res, options);

    // Handle OPTIONS preflight request
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Verify origin for non-OPTIONS requests
    const origin = req.headers.origin;
    if (origin && !isOriginAllowed(origin)) {
      return res.status(403).json({
        success: false,
        error: 'Origin not allowed',
      });
    }

    // Call the actual handler
    return handler(req, res);
  };
}

/**
 * Validate request origin
 * Use this for additional origin validation in handlers
 */
export function validateOrigin(req: NextApiRequest): boolean {
  const origin = req.headers.origin;
  return isOriginAllowed(origin);
}

/**
 * Add additional allowed origin at runtime
 */
export function addAllowedOrigin(origin: string): void {
  if (!ALLOWED_ORIGINS.includes(origin)) {
    ALLOWED_ORIGINS.push(origin);
  }
}
