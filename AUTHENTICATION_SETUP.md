# Authentication Setup Guide

This PWA Inspection Platform now supports **dual authentication** with Microsoft 365 SSO as the primary method and PIN-based login as a fallback/testing option.

## 🔐 Security Features

✅ **JWT Token-Based Authentication** - Secure, signed tokens instead of simple user IDs
✅ **Email Domain Whitelisting** - Restrict Microsoft login to approved company domains
✅ **Rate Limiting** - Prevent brute force attacks (5 attempts per 15 minutes)
✅ **Feature Flags** - Enable/disable authentication methods independently
✅ **Audit Trail Logging** - Track all login attempts and methods
✅ **HttpOnly Cookies** - Protect against XSS attacks

---

## 📋 Quick Start

### 1. Generate JWT Secret

First, generate a secure JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and add it to your `.env` file.

### 2. Configure Environment Variables

Create a `.env` file (or `.env.local`) with the following:

```bash
# Required: JWT Secret for token signing
JWT_SECRET=your_generated_secret_from_step_1

# Optional: JWT expiration time (default: 7 days)
JWT_EXPIRES_IN=7d

# Authentication Feature Flags
ENABLE_PIN_AUTH=true              # Allow PIN-based login
ENABLE_MICROSOFT_AUTH=true        # Allow Microsoft SSO
PREFER_MICROSOFT_AUTH=true        # Show Microsoft login first

# Email Domain Whitelist (required for Microsoft auth)
ALLOWED_EMAIL_DOMAINS=theta-edge.com

# Rate Limiting Configuration
AUTH_RATE_LIMIT_MAX_REQUESTS=5    # Max login attempts
AUTH_RATE_LIMIT_WINDOW_MS=900000  # 15 minutes in milliseconds

# Microsoft OAuth Configuration (from Azure Portal)
NEXT_PUBLIC_SHAREPOINT_OAUTH_CLIENT_ID=your_client_id
NEXT_PUBLIC_SHAREPOINT_TENANT_ID=your_tenant_id_or_common
```

### 3. Set Up Microsoft Azure App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations** > **New registration**
3. Configure:
   - **Name**: "PWA Inspection Platform"
   - **Redirect URI**:
     - Development: `http://localhost:8080/api/auth/microsoft/callback`
     - Production: `https://yourdomain.com/api/auth/microsoft/callback`
   - Click **Register**

4. Under **API permissions**, add:
   - `User.Read` (Delegated)
   - `openid` (Delegated)
   - `profile` (Delegated)
   - `email` (Delegated)
   - `offline_access` (Delegated)

5. Copy:
   - **Application (client) ID** → `NEXT_PUBLIC_SHAREPOINT_OAUTH_CLIENT_ID`
   - **Directory (tenant) ID** → `NEXT_PUBLIC_SHAREPOINT_TENANT_ID`

6. **(Optional) Request Admin Consent**:
   - Share this URL with your IT admin:
     ```
     https://login.microsoftonline.com/{TENANT_ID}/adminconsent?client_id={CLIENT_ID}
     ```
   - This allows all users to login without individual consent popups

---

## 🎯 Authentication Flow

### Microsoft 365 SSO (Primary Method)

1. User clicks "Sign in with Microsoft"
2. Redirected to Microsoft login page
3. After successful login, Microsoft redirects back with authorization code
4. System validates:
   - ✅ Email domain is in whitelist (`@theta-edge.com`)
   - ✅ Rate limit not exceeded
   - ✅ Microsoft account is valid
5. System checks if user exists:
   - **Existing user**: Updates Microsoft tokens, generates JWT
   - **New user**: Creates account with NO PIN (Microsoft-only access)
6. JWT token set as HttpOnly cookie
7. User redirected to analytics dashboard

### PIN Login (Testing/Fallback)

1. User enters 4-digit PIN
2. System validates:
   - ✅ Rate limit not exceeded
   - ✅ PIN auth is enabled
   - ✅ PIN matches database
3. Generates JWT token
4. JWT token set as HttpOnly cookie
5. User redirected to analytics dashboard

---

## 🔧 Configuration Options

### Email Domain Whitelisting

**Single Domain:**
```bash
ALLOWED_EMAIL_DOMAINS=theta-edge.com
```

**Multiple Domains:**
```bash
ALLOWED_EMAIL_DOMAINS=theta-edge.com,partner-company.com,contractor.com
```

**Allow All Domains (NOT RECOMMENDED):**
```bash
# Leave empty or don't set the variable
ALLOWED_EMAIL_DOMAINS=
```

### Feature Flags

**Microsoft-Only (Recommended for Production):**
```bash
ENABLE_PIN_AUTH=false
ENABLE_MICROSOFT_AUTH=true
PREFER_MICROSOFT_AUTH=true
```

**Dual Authentication (Recommended for Testing):**
```bash
ENABLE_PIN_AUTH=true
ENABLE_MICROSOFT_AUTH=true
PREFER_MICROSOFT_AUTH=true
```

**PIN-Only (Legacy Mode):**
```bash
ENABLE_PIN_AUTH=true
ENABLE_MICROSOFT_AUTH=false
```

### Rate Limiting

**Default (Recommended):**
```bash
AUTH_RATE_LIMIT_MAX_REQUESTS=5
AUTH_RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
```

**Stricter (High Security):**
```bash
AUTH_RATE_LIMIT_MAX_REQUESTS=3
AUTH_RATE_LIMIT_WINDOW_MS=1800000  # 30 minutes
```

**Development (Relaxed):**
```bash
AUTH_RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_WINDOW_MS=300000  # 5 minutes
```

---

## 👥 User Management

### New Microsoft Users

When a user logs in with Microsoft for the first time:
- Account is automatically created
- Role is mapped based on job title/department (see `src/utils/microsoft-auth.ts:132`)
- **NO PIN is generated** (Microsoft-only access)
- Default permissions are assigned based on role

### Role Mapping (Automatic)

Based on Microsoft Graph API data:

| Job Title/Department | Assigned Role |
|---------------------|---------------|
| "admin", "manager", "IT" | `admin` |
| "supervisor", "lead", "coordinator" | `supervisor` |
| "inspector", "HSE", "safety" | `inspector` |
| Default (all others) | `employee` |

**To customize role mapping**, edit `src/utils/microsoft-auth.ts` function `mapMicrosoftUserToRole()`.

### Adding PIN to Existing User

If you need to add PIN access to a Microsoft user:

1. Access your Supabase database
2. Run:
   ```sql
   UPDATE users
   SET pin = '1234'
   WHERE email = 'user@theta-edge.com';
   ```
3. User can now login with either Microsoft OR PIN

---

## 🛡️ Security Best Practices

### ✅ DO:
- Use a strong, random JWT secret (64+ characters)
- Keep JWT_SECRET in `.env` (never commit to git)
- Use HTTPS in production (enables secure cookies)
- Enable rate limiting
- Whitelist specific email domains
- Regularly rotate JWT secrets
- Monitor audit trail for suspicious activity

### ❌ DON'T:
- Use weak JWT secrets like "secret123"
- Commit `.env` file to version control
- Allow all email domains in production
- Disable rate limiting
- Use PIN-only auth for production (unless required)
- Share JWT secrets in plaintext

---

## 🔍 Monitoring & Debugging

### Check Authentication Logs

All login attempts are logged to the `audit_trail` table:

```sql
SELECT * FROM audit_trail
WHERE action = 'LOGIN'
ORDER BY timestamp DESC
LIMIT 50;
```

### Check Rate Limiting Status

Rate limits are stored in-memory (resets on server restart). To check:

1. Attempt login 5+ times
2. Check response headers:
   - `X-RateLimit-Limit`: Max attempts allowed
   - `X-RateLimit-Remaining`: Attempts remaining
   - `X-RateLimit-Reset`: Unix timestamp when limit resets
   - `Retry-After`: Seconds until you can retry

### Verify JWT Token

For debugging, decode a JWT token:

```bash
# In Node.js console
const jwt = require('jsonwebtoken');
const token = 'your_token_here';
console.log(jwt.decode(token));
```

Or use [jwt.io](https://jwt.io)

---

## 🧪 Testing

### Test Microsoft Login Flow

1. Ensure Microsoft app registration is configured
2. Set environment variables
3. Start development server: `npm run dev`
4. Visit `http://localhost:8080/login`
5. Click "Sign in with Microsoft"
6. Login with `user@theta-edge.com`
7. Verify redirect to analytics dashboard

### Test Email Domain Restriction

1. Try logging in with `user@otherdomain.com`
2. Should see error: "Your email domain is not authorized"

### Test Rate Limiting

1. Enter wrong PIN 5 times
2. Should see error: "Too many login attempts. Please try again later."
3. Check response header `Retry-After` for wait time

### Test Dual Authentication

1. Create user via Microsoft login (no PIN)
2. Manually add PIN to database
3. Verify both login methods work

---

## 📊 Middleware Usage for Developers

### Protect API Endpoints

**Simple Authentication:**
```typescript
import { authenticate } from '@/lib/auth-middleware';

export default authenticate(async (req, res) => {
  const user = req.user; // JWT payload available here
  // Your protected logic
});
```

**Role-Based Access:**
```typescript
import { requireRole } from '@/lib/auth-middleware';

export default requireRole(['admin', 'supervisor'], async (req, res) => {
  // Only admin and supervisor can access
});
```

**Permission-Based Access:**
```typescript
import { requirePermission } from '@/lib/auth-middleware';

export default requirePermission('canManageUsers', async (req, res) => {
  // Only users with canManageUsers permission can access
});
```

**Optional Authentication:**
```typescript
import { optionalAuthenticate } from '@/lib/auth-middleware';

export default optionalAuthenticate(async (req, res) => {
  if (req.user) {
    // User is logged in
  } else {
    // User is not logged in, but request continues
  }
});
```

---

## 🚀 Migration from Old System

If upgrading from the old PIN-only system:

1. **Backup your database** before proceeding
2. Install dependencies: `npm install jsonwebtoken bcrypt`
3. Set environment variables (see Quick Start)
4. Existing PIN users will continue to work
5. New Microsoft users will be auto-provisioned
6. Gradually migrate users to Microsoft login
7. Eventually disable PIN auth: `ENABLE_PIN_AUTH=false`

---

## 🐛 Troubleshooting

### "JWT_SECRET environment variable is not set"
- Add `JWT_SECRET` to your `.env` file
- Generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### "Your email domain is not authorized"
- Check `ALLOWED_EMAIL_DOMAINS` in `.env`
- Ensure your email domain matches exactly (e.g., `theta-edge.com`)

### "Microsoft authentication is disabled"
- Set `ENABLE_MICROSOFT_AUTH=true` in `.env`

### "Too many login attempts"
- Wait 15 minutes (or configured window time)
- Check rate limit configuration
- For development, increase `AUTH_RATE_LIMIT_MAX_REQUESTS`

### Microsoft login redirects to error page
- Verify Azure app registration redirect URI matches your server
- Check Microsoft OAuth client ID and tenant ID
- Ensure API permissions are granted (and admin consented if needed)

---

## 📞 Support

For issues or questions:
1. Check the [GitHub Issues](https://github.com/your-repo/issues)
2. Review Supabase `audit_trail` table for error logs
3. Check browser console for client-side errors
4. Verify all environment variables are set correctly

---

**Last Updated**: 2025-12-03
**Authentication Version**: 2.0 (Dual Auth with JWT)
