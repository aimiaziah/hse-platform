# Quick Fixes Before DevSecOps (4-6 hours)

Run these commands NOW to address critical security issues:

## 1. Check if Secrets Are Exposed (5 minutes)

```bash
# Check if .env.local is in git
git log --all --full-history -- .env.local

# If you see any commits, your secrets are exposed!
# You MUST rotate all credentials immediately
```

## 2. Update Dependencies (15 minutes)

```bash
# Update axios (fixes CSRF/SSRF vulnerabilities)
npm install axios@1.13.2

# Fix jws vulnerability
npm audit fix

# Verify
npm audit --production
```

## 3. Enable ESLint (30 minutes)

Edit `next.config.js` line 32:
```javascript
// Before
ignoreDuringBuilds: true,

// After
ignoreDuringBuilds: false,
```

Then run:
```bash
npm run build

# Fix any errors that appear
npm run lint --fix
```

## 4. Add .env.local to .gitignore (2 minutes)

```bash
# Verify it's there
grep "\.env\.local" .gitignore

# If not found, add it
echo ".env.local" >> .gitignore
echo ".env*.local" >> .gitignore
```

## 5. Set Up Supabase Backups (30 minutes)

1. Go to https://app.supabase.com/project/ooriqpeqtfmgfynlbsxb/settings/addons
2. Enable "Point in Time Recovery" (PITR)
3. Configure daily backups
4. Test restore once

## 6. Create Security Checklist (15 minutes)

```bash
# Create a pre-deployment checklist
cat > PRE_DEPLOYMENT_SECURITY_CHECKLIST.md << 'EOF'
# Pre-Deployment Security Checklist

Before deploying to production, verify:

- [ ] No secrets in git history
- [ ] All dependencies updated (npm audit shows 0 high/critical)
- [ ] ESLint enabled and passing
- [ ] Backups configured and tested
- [ ] All authentication endpoints have validation
- [ ] Security headers configured
- [ ] HTTPS enabled
- [ ] Rate limiting active
- [ ] Logging configured
- [ ] Incident response plan documented

Last updated: $(date)
EOF
```

## 7. Document Current State (30 minutes)

Create `SECURITY_STATUS.md`:
```bash
cat > SECURITY_STATUS.md << 'EOF'
# Security Status - $(date)

## Completed
- [x] Environment validation
- [x] Input validation framework
- [x] Structured logging
- [x] Security headers
- [x] 7 API endpoints validated
- [x] axios updated to 1.13.2
- [x] jws vulnerability fixed

## In Progress
- [ ] Next.js upgrade (13.1.6 → 16.0.7)
- [ ] Console.log migration (489 remaining)
- [ ] API validation (7/36 endpoints)

## Critical Gaps
- [ ] Backup strategy
- [ ] API documentation
- [ ] Security testing
- [ ] Incident response plan

## Next Steps
1. Complete dependency updates
2. Enable ESLint
3. Set up backups
4. Plan Next.js upgrade
EOF
```

## Total Time: 4-6 hours

After completing these quick fixes, you'll be at **~55% DevSecOps readiness**.
