# One Week Security Plan (Small Team - 3-5 Users)

**Reality Check:** You have 3-5 active users and 100 read-only viewers. You don't need enterprise DevSecOps.

**Goal:** Make it reasonably secure, backed up, and monitorable in 1 week.

---

## Day 1 (Monday) - Critical Fixes (2 hours)

### ✅ 1. Check Git History for Secrets (5 min)
```bash
git log --all --full-history -- .env.local
```

**If secrets are exposed:**
```bash
# Add to .gitignore immediately
echo ".env.local" >> .gitignore
echo ".env*.local" >> .gitignore

# Rotate secrets:
# - Generate new JWT_SECRET (64 characters)
# - Rotate DigitalOcean keys (in DO dashboard)
# - Keep Supabase keys (they're project-specific)
```

### ✅ 2. Update Critical Dependencies (30 min)
```bash
# Fix axios vulnerability
npm install axios@1.13.2

# Fix jws vulnerability
npm audit fix

# Verify
npm audit --production

# Test the app
npm run dev
# Login and create an inspection to verify nothing broke
```

### ✅ 3. Set Up Supabase Backups (30 min)
1. Go to: https://app.supabase.com/project/ooriqpeqtfmgfynlbsxb/settings/addons
2. Enable **Point in Time Recovery (PITR)** if available
3. Or configure daily exports:
   - Database > Backups > Schedule backup
   - Set to daily at 2 AM
4. **Test restore once** to verify it works

### ✅ 4. Enable ESLint (30 min)
Edit `next.config.js`:
```javascript
eslint: {
  ignoreDuringBuilds: false,  // Changed from true
  dirs: ['src', 'pages'],
}
```

Run:
```bash
npm run build

# If errors appear, fix critical ones only
# For now, you can disable specific rules that are non-security
```

### ✅ 5. Quick Security Audit (30 min)
```bash
# Check for exposed secrets
grep -r "sk_live\|sk_test\|password.*=.*['\"]" src/ --include="*.ts" --include="*.tsx"

# Count remaining console.log (just for tracking)
grep -r "console\\.log\\|console\\.error" src/ --include="*.ts" --include="*.tsx" | wc -l

# Verify auth endpoints have validation
grep -r "validateBody" src/pages/api/auth/ --include="*.ts"
```

---

## Day 2 (Tuesday) - Monitoring (2 hours)

### ✅ 1. Create Health Check Endpoint (30 min)
Create `src/pages/api/health.ts`:
```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check database connection
    const supabase = getServiceSupabase();
    const { error } = await supabase.from('users').select('count').limit(1);

    if (error) throw error;

    return res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    });
  } catch (error) {
    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
```

Test: `curl http://localhost:8080/api/health`

### ✅ 2. Set Up Simple Uptime Monitoring (30 min)
Use **UptimeRobot** (free for 50 monitors):
1. Sign up at https://uptimerobot.com
2. Add monitor:
   - Type: HTTP(s)
   - URL: https://your-domain.com/api/health
   - Interval: 5 minutes
   - Alert contacts: Your email
3. Add monitor for main page: https://your-domain.com

### ✅ 3. Enable Supabase Monitoring (15 min)
1. Go to Supabase dashboard > Reports
2. Enable alerts:
   - Database CPU > 80%
   - Storage > 80%
   - Failed authentication attempts > 10/hour
3. Add your email for alerts

### ✅ 4. Document Basic Runbook (45 min)
Create `INCIDENT_RESPONSE.md`:
```markdown
# Incident Response Guide (5 Users)

## If App Is Down

1. Check health endpoint: `curl https://your-domain.com/api/health`
2. Check Supabase status: https://status.supabase.com
3. Check deployment logs: [Your hosting platform]
4. Restart app if needed
5. Notify 5 users via email/Slack

## If User Can't Login

1. Check Supabase users table (is user active?)
2. Verify PIN is correct
3. Check audit_trail for failed attempts
4. Reset PIN if needed: Admin dashboard

## If Data Loss

1. Stop app immediately
2. Go to Supabase > Database > Backups
3. Restore from latest backup
4. Verify data integrity
5. Restart app

## Contacts
- Supabase Support: support@supabase.io
- Hosting Support: [Your platform]
- Your email: [Your email]
```

---

## Day 3 (Wednesday) - Testing (2 hours)

### ✅ 1. Manual Security Testing (1 hour)
Test these scenarios:
```bash
# 1. Invalid login attempts
curl -X POST http://localhost:8080/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"pin":"0000"}'
# Should return 401

# 2. SQL injection attempt
curl -X POST http://localhost:8080/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"pin":"0000 OR 1=1"}'
# Should return 400 (validation error)

# 3. XSS attempt
curl -X POST http://localhost:8080/api/admin/users \
     -H "Content-Type: application/json" \
     -H "Cookie: auth-token=YOUR_TOKEN" \
     -d '{"name":"<script>alert(1)</script>","pin":"1234","role":"inspector"}'
# Should sanitize or reject

# 4. Check security headers
curl -I http://localhost:8080
# Should see X-Frame-Options, X-Content-Type-Options, etc.
```

### ✅ 2. Backup Testing (30 min)
```bash
# 1. Create test data in Supabase
# 2. Take manual backup
# 3. Delete test data
# 4. Restore backup
# 5. Verify test data is back
```

### ✅ 3. Load Testing (30 min)
For 3-5 users, this is simple:
```bash
# Install Apache Bench (if not installed)
# brew install apache-bench (macOS)

# Test with 10 concurrent users (more than you'll have)
ab -n 100 -c 10 http://localhost:8080/

# Should handle easily
```

---

## Day 4 (Thursday) - Optional Improvements (2 hours)

**ONLY IF YOU HAVE TIME - SKIP IF BUSY**

### Optional: Add More Validation
Pick 3-5 most-used endpoints and add validation:
- `/api/export/fire-extinguisher-template.ts`
- `/api/export/hse-inspection-template.ts`
- `/api/manhours/index.ts`

### Optional: Migrate Critical console.log
Only in authentication and user management files:
- `src/pages/api/auth/*`
- `src/pages/api/admin/users/*`

---

## Day 5 (Friday) - Deploy & Document (2 hours)

### ✅ 1. Pre-Deployment Checklist (30 min)
```bash
# Run all checks
npm run build
npm audit --production
npm run lint

# Test locally one more time
npm run dev
# Test: login, create inspection, export, view analytics
```

### ✅ 2. Deploy to Production (30 min)
```bash
# Commit changes
git add .
git commit -m "Security improvements: updated deps, backups, monitoring"
git push

# Deploy (your hosting platform)
# Vercel/Netlify will auto-deploy
# Or manual deploy if needed
```

### ✅ 3. Post-Deployment Verification (30 min)
```bash
# 1. Check health endpoint
curl https://your-domain.com/api/health

# 2. Test login
# 3. Create test inspection
# 4. Check UptimeRobot shows "up"
# 5. Verify backup ran (next day)
```

### ✅ 4. Update Documentation (30 min)
Create `SECURITY_SUMMARY.md`:
```markdown
# Security Summary (Small Team)

## Implemented
- [x] Critical vulnerabilities fixed
- [x] Automated backups enabled
- [x] Health check endpoint
- [x] Uptime monitoring
- [x] Auth validation
- [x] Security headers
- [x] Incident response plan

## Skipped (Not Needed for 3-5 Users)
- Console.log migration (not critical for 5 users)
- Extensive API validation (auth is enough)
- Next.js upgrade (stable on 13.1.6 for now)
- Complex rate limiting (3 users won't abuse)
- API docs (internal tool)

## Maintenance
- [ ] Monthly: Check npm audit
- [ ] Monthly: Test backup restore
- [ ] Quarterly: Review access logs
- [ ] Yearly: Rotate JWT secret

## If You Grow
When you reach 50+ users, implement:
- Next.js upgrade
- Full API validation
- Redis rate limiting
- Comprehensive logging
- Security testing

Last updated: [DATE]
```

---

## Total Time Investment

| Day | Task | Time |
|-----|------|------|
| Monday | Critical fixes | 2 hours |
| Tuesday | Monitoring | 2 hours |
| Wednesday | Testing | 2 hours |
| Thursday | Optional (skip if busy) | 0-2 hours |
| Friday | Deploy & document | 2 hours |
| **TOTAL** | | **8-10 hours** |

---

## What You're NOT Doing (And That's OK for 5 Users)

1. ❌ Full DevSecOps pipeline (overkill)
2. ❌ Extensive API validation (auth is enough)
3. ❌ Console.log migration (489 statements - not critical)
4. ❌ Next.js upgrade (risky, current version works)
5. ❌ Rate limiting (3 users won't DDoS you)
6. ❌ OWASP ZAP (overkill for internal tool)
7. ❌ Secret rotation (if not exposed)
8. ❌ API documentation (3 users know how it works)

---

## Bottom Line

**For 3-5 users, this is enough:**
- ✅ No critical vulnerabilities
- ✅ Data is backed up
- ✅ You'll know if it goes down
- ✅ Basic security in place

**When to revisit:** When you reach 50+ users or handle sensitive data.

---

**Next Action:** Start with Day 1 tasks (2 hours). Do them NOW. 👇
