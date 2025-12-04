# Security Improvements Implementation Guide

This document outlines the security improvements made to the PWA Inspection Platform before implementing DevSecOps practices.

---

## ✅ Critical Fixes Completed

### 1. **Dependency Vulnerabilities Fixed**

**What was fixed:**
- ✅ `axios` updated from 1.3.4 → 1.13.2 (Fixed CSRF and SSRF vulnerabilities)
- ✅ `@babel/traverse` updated to 7.28.5 (Fixed arbitrary code execution vulnerability)
- ✅ `@babel/helpers` updated to latest (Fixed ReDoS vulnerability)

**Remaining vulnerabilities:**
- ⚠️ Next.js 13.1.6 has critical vulnerabilities (upgrade to v16 requires breaking changes)
- ⚠️ xlsx library has high severity issues (no fix available - consider alternative)

**Action:** Run `npm audit` regularly and update dependencies

---

### 2. **ESLint Enabled in Production Builds**

**Before:**
```javascript
eslint: {
  ignoreDuringBuilds: true,  // ❌ DANGEROUS
}
```

**After:**
```javascript
eslint: {
  ignoreDuringBuilds: false,  // ✅ Security checks enforced
  dirs: ['src', 'pages'],
}
```

**Impact:** Security issues will now be caught during builds before deployment

---

### 3. **Comprehensive Security Headers Added**

**Location:** `next.config.js`

**Headers implemented:**
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-XSS-Protection: 1; mode=block` - Enables XSS filter
- `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer info
- `Permissions-Policy` - Restricts camera, microphone, geolocation
- `Strict-Transport-Security` - Forces HTTPS for 1 year
- `Content-Security-Policy` - Controls resource loading

**Test:**
```bash
curl -I http://localhost:8080 | grep -E "X-Frame|X-Content|X-XSS|CSP"
```

---

### 4. **CORS Protection Implemented**

**New file:** `src/lib/cors.ts`

**Usage in API routes:**

```typescript
import { withCors } from '@/lib/cors';

export default withCors(async (req, res) => {
  // Your API logic here
  res.json({ success: true });
});
```

**Features:**
- ✅ Origin validation
- ✅ Automatic OPTIONS handling
- ✅ Configurable allowed origins
- ✅ Development/production modes

**Configure allowed origins:**
```typescript
// Edit src/lib/cors.ts
const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'https://yourdomain.com',
];
```

---

### 5. **Structured Logging System**

**New file:** `src/lib/logger.ts`

**Features:**
- ✅ Automatic sensitive data redaction (PIN, tokens, passwords)
- ✅ Log levels: debug, info, warn, error, security
- ✅ Structured JSON logging
- ✅ Security event tracking

**Replace console.log:**

**Before:**
```typescript
console.log('User logged in:', user);
console.error('Login failed:', error);
```

**After:**
```typescript
import { logger } from '@/lib/logger';

logger.info('User logged in', { userId: user.id });
logger.error('Login failed', error, { userId: user.id });
```

**Security events:**
```typescript
// Log authentication events
logger.logAuth('login', userId, { method: 'pin' });
logger.logAuth('login_failed', userId, { reason: 'invalid_pin' });

// Log security events
logger.security('UNAUTHORIZED_ACCESS_ATTEMPT', {
  ip: req.socket.remoteAddress,
  endpoint: req.url
});
```

**Sensitive data is automatically redacted:**
```typescript
logger.info('Processing request', {
  pin: '1234',        // Will be logged as [REDACTED]
  token: 'abc123',    // Will be logged as [REDACTED]
  name: 'John Doe',   // Will be logged normally
});
```

**Configure log level:**
```bash
# .env
LOG_LEVEL=debug   # Show all logs (development)
LOG_LEVEL=info    # Default (production)
LOG_LEVEL=error   # Only errors (production)
```

---

### 6. **Redis-Based Rate Limiting**

**New file:** `src/lib/rate-limiter-redis.ts`

**Features:**
- ✅ Production: Uses Redis (persistent across restarts)
- ✅ Development: Uses in-memory (no Redis required)
- ✅ Automatic fallback if Redis unavailable
- ✅ Distributed deployment support

**Setup Redis (Production):**

**Option 1: Upstash (Recommended - Free tier)**
1. Sign up at [upstash.com](https://upstash.com)
2. Create a Redis database
3. Copy the Redis URL
4. Add to `.env`:
   ```bash
   REDIS_URL=redis://default:password@region.upstash.io:port
   ```

**Option 2: Redis Cloud**
1. Sign up at [redis.com/try-free](https://redis.com/try-free)
2. Create a database
3. Add to `.env`:
   ```bash
   REDIS_URL=redis://username:password@host:port
   ```

**Option 3: Local Redis (Development)**
```bash
# Install Redis
# macOS: brew install redis
# Ubuntu: sudo apt-get install redis-server
# Windows: Use WSL or Docker

# Start Redis
redis-server

# Add to .env
REDIS_URL=redis://localhost:6379
```

**Usage:**
```typescript
import { rateLimitMiddleware } from '@/lib/rate-limiter-redis';

export default async function handler(req, res) {
  // Apply rate limiting
  if (await rateLimitMiddleware(req, res, 'api')) {
    return; // Rate limit exceeded, response already sent
  }

  // Your API logic here
}
```

**Update existing endpoints:**
Replace old rate limiter with new one:
```typescript
// Before
import { rateLimitMiddleware } from '@/lib/rate-limiter';

// After
import { rateLimitMiddleware } from '@/lib/rate-limiter-redis';
```

---

### 7. **Request Body Size Limits**

**Location:** `next.config.js`

```javascript
api: {
  bodyParser: {
    sizeLimit: '10mb', // Prevents DoS via large payloads
  },
}
```

**Adjust based on your needs:**
- Image uploads: `10mb` - `50mb`
- JSON only: `1mb` - `5mb`

---

## 📋 Migration Checklist

### Immediate Actions (Do Now)

- [ ] **Update environment variables**
  ```bash
  cp .env.example .env.local
  # Add Redis URL if using production Redis
  # Set LOG_LEVEL=debug for development
  ```

- [ ] **Test the application**
  ```bash
  npm run dev
  # Verify no errors in console
  # Test login functionality
  # Check security headers in browser DevTools
  ```

- [ ] **Update API routes to use new security features**
  - [ ] Replace console.log with logger
  - [ ] Add CORS protection to public APIs
  - [ ] Use Redis-based rate limiting

### Example API Route Migration

**Before:**
```typescript
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req, res) {
  console.log('API called:', req.url);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body;
    console.log('Processing:', data);

    // Your logic here

    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
}
```

**After (with security improvements):**
```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { withCors } from '@/lib/cors';
import { rateLimitMiddleware } from '@/lib/rate-limiter-redis';
import { logger } from '@/lib/logger';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  logger.logRequest(req.method!, req.url || '', {
    userAgent: req.headers['user-agent']
  });

  // Apply rate limiting
  if (await rateLimitMiddleware(req, res, 'api')) {
    return; // Rate limited
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body;
    logger.debug('Processing request', { dataSize: JSON.stringify(data).length });

    // Your logic here

    logger.info('Request processed successfully');
    res.json({ success: true });
  } catch (error) {
    logger.logApiError(req.url || '', 500, error);
    res.status(500).json({ error: 'Internal error' });
  }
}

// Apply CORS protection
export default withCors(handler);
```

---

## 🧪 Testing

### 1. Test Security Headers
```bash
# Start dev server
npm run dev

# Check headers
curl -I http://localhost:8080

# Should see:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Content-Security-Policy: ...
```

### 2. Test CORS Protection
```bash
# Should be blocked (wrong origin)
curl -H "Origin: https://evil.com" \
     -H "Content-Type: application/json" \
     http://localhost:8080/api/some-endpoint

# Should work (allowed origin)
curl -H "Origin: http://localhost:8080" \
     -H "Content-Type: application/json" \
     http://localhost:8080/api/some-endpoint
```

### 3. Test Rate Limiting
```bash
# Make 6 requests quickly (limit is 5)
for i in {1..6}; do
  curl -X POST http://localhost:8080/api/auth/login \
       -H "Content-Type: application/json" \
       -d '{"pin":"0000"}'
done

# 6th request should return 429 Too Many Requests
```

### 4. Test Logging
```bash
# Start server with debug logs
LOG_LEVEL=debug npm run dev

# Make a request
curl http://localhost:8080/api/some-endpoint

# Check console - should see structured logs with timestamps
```

---

## 🚀 Production Deployment Checklist

Before deploying to production:

- [ ] Update Next.js to latest stable version (v16+)
- [ ] Set up Redis for rate limiting (Upstash recommended)
- [ ] Configure `REDIS_URL` in production environment
- [ ] Set `LOG_LEVEL=info` in production
- [ ] Enable HTTPS (required for secure cookies and HSTS)
- [ ] Update `ALLOWED_ORIGINS` in CORS config with production domain
- [ ] Review and tighten Content-Security-Policy
- [ ] Set up log aggregation (e.g., DataDog, LogRocket, Sentry)
- [ ] Configure security monitoring alerts
- [ ] Run security scan: `npm audit`
- [ ] Test all authentication flows
- [ ] Verify rate limiting with load testing
- [ ] Document security incident response plan

---

## 📊 Monitoring & Alerts

### Set up alerts for:
1. **Rate limit exceeded** - Potential attack
2. **Multiple failed login attempts** - Brute force attempt
3. **Unusual API access patterns** - Anomaly detection
4. **Security events** - All `logger.security()` calls
5. **High error rates** - Potential issues

### Recommended tools:
- **Logs:** Datadog, Papertrail, Logtail
- **Security:** Sentry, LogRocket
- **Uptime:** UptimeRobot, Better Uptime
- **Redis:** Upstash Console, Redis Insight

---

## 🐛 Troubleshooting

### Rate limiting not working
```bash
# Check if Redis is connected
# Look for log: "Redis connected for rate limiting"

# Verify Redis URL
echo $REDIS_URL

# Test Redis connection
redis-cli -u $REDIS_URL ping
# Should return: PONG
```

### CORS errors in browser
```bash
# Check browser console for:
# "Access-Control-Allow-Origin"

# Verify origin in ALLOWED_ORIGINS array
# Add your domain to src/lib/cors.ts
```

### Logs not showing
```bash
# Check LOG_LEVEL
echo $LOG_LEVEL

# Set to debug
export LOG_LEVEL=debug
npm run dev
```

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [Content Security Policy Reference](https://content-security-policy.com/)
- [Redis Rate Limiting Guide](https://redis.io/docs/manual/patterns/rate-limiter/)

---

## 🎯 Next Steps (After These Fixes)

Once these security improvements are tested and deployed:

1. **Set up dependency scanning** - Snyk, Dependabot
2. **Implement secret scanning** - GitGuardian, TruffleHog
3. **Add API monitoring** - Datadog, New Relic
4. **Set up SIEM** - Splunk, ELK Stack (if needed)
5. **Schedule penetration testing** - Quarterly or bi-annually
6. **Create security runbook** - Incident response procedures
7. **Implement backup strategy** - Automated Supabase backups

---

**Last Updated:** 2025-12-03
**Security Version:** 2.0
**Status:** ✅ Ready for DevSecOps implementation
