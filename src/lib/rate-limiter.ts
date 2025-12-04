// Simple In-Memory Rate Limiter for Authentication
import { NextApiRequest, NextApiResponse } from 'next';
import { getRateLimitConfig } from './auth-config';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
// Note: This will reset on server restart. For production, use Redis or similar
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Get client identifier (IP address)
 */
function getClientIdentifier(req: NextApiRequest): string {
  // Try to get real IP from headers (for proxy/load balancer scenarios)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  // Fallback to socket address
  return req.socket.remoteAddress || 'unknown';
}

/**
 * Clean up expired entries from the store
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  const entries = Array.from(rateLimitStore.entries());
  for (const [key, entry] of entries) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Check if request should be rate limited
 * Returns true if rate limit exceeded
 */
export function checkRateLimit(
  req: NextApiRequest,
  prefix = 'auth',
): {
  limited: boolean;
  remaining: number;
  resetTime: number;
} {
  const config = getRateLimitConfig();
  const clientId = `${prefix}:${getClientIdentifier(req)}`;
  const now = Date.now();

  // Clean up old entries periodically (every 100 requests)
  if (Math.random() < 0.01) {
    cleanupExpiredEntries();
  }

  let entry = rateLimitStore.get(clientId);

  // Create new entry if doesn't exist or expired
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(clientId, entry);
  }

  // Increment counter
  entry.count++;

  // Check if limit exceeded
  const limited = entry.count > config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);

  return {
    limited,
    remaining,
    resetTime: entry.resetTime,
  };
}

/**
 * Rate limiting middleware
 */
export function rateLimitMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  prefix = 'auth',
): boolean {
  const { limited, remaining, resetTime } = checkRateLimit(req, prefix);

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', getRateLimitConfig().maxRequests.toString());
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
  res.setHeader('X-RateLimit-Reset', Math.floor(resetTime / 1000).toString());

  if (limited) {
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
    res.setHeader('Retry-After', retryAfter.toString());
    res.status(429).json({
      success: false,
      error: 'Too many login attempts. Please try again later.',
      retryAfter,
    });
    return true;
  }

  return false;
}

/**
 * Reset rate limit for a specific client (useful after successful login)
 */
export function resetRateLimit(req: NextApiRequest, prefix = 'auth'): void {
  const clientId = `${prefix}:${getClientIdentifier(req)}`;
  rateLimitStore.delete(clientId);
}
