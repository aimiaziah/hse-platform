# Incident Response Guide (Small Team - 3-5 Users)

**Last Updated:** 2025-12-05
**Application:** PWA Inspection Platform
**User Base:** 3-5 active users, 100 read-only analytics viewers

---

## 🚨 Emergency Contacts

| Role | Contact | Availability |
|------|---------|--------------|
| **Primary Admin** | [Your Name/Email] | 24/7 |
| **Supabase Support** | support@supabase.io | 24/7 (Pro plan) |
| **Hosting Platform** | [Your platform support] | Business hours |

---

## 📊 Quick Status Checks

### 1. Check Application Health
```bash
curl https://your-domain.com/api/health
```

**Expected Response (Healthy):**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-05T10:00:00.000Z",
  "database": "connected",
  "version": "1.0.0",
  "uptime": 86400
}
```

### 2. Check Supabase Status
- Dashboard: https://app.supabase.com/project/ooriqpeqtfmgfynlbsxb
- Status Page: https://status.supabase.com

### 3. Check Uptime Monitor
- UptimeRobot: https://uptimerobot.com (if configured)

---

## 🔥 Common Incidents & Solutions

### Incident 1: Application is Down

**Symptoms:**
- Users can't access the application
- Health endpoint returns 503 or times out
- UptimeRobot sends alert

**Immediate Actions:**
1. **Check health endpoint:**
   ```bash
   curl https://your-domain.com/api/health
   ```

2. **Check Supabase status:**
   - Go to https://status.supabase.com
   - Check if there's an ongoing incident

3. **Check deployment logs:**
   - Vercel: https://vercel.com/dashboard
   - Netlify: https://app.netlify.com
   - Check for deployment errors

4. **Restart the application:**
   - If on Vercel/Netlify: Trigger a new deployment
   - If on VPS: Restart the service

5. **Notify users:**
   - Email the 3-5 active users
   - Estimated resolution time
   - Workaround if available

**Prevention:**
- Set up UptimeRobot monitoring
- Enable Supabase alerts
- Keep deployment logs accessible

---

### Incident 2: Users Can't Login

**Symptoms:**
- "Invalid PIN" error
- Login page loads but authentication fails
- Multiple users report the issue

**Troubleshooting Steps:**

1. **Check if it's a single user or all users:**
   - Single user: PIN issue
   - All users: System issue

2. **For single user issues:**
   ```bash
   # Check Supabase users table
   # Go to: https://app.supabase.com/project/ooriqpeqtfmgfynlbsxb/editor
   # Find user in users table
   # Check is_active = true
   ```

3. **Reset user PIN (Admin Dashboard):**
   - Login as admin
   - Go to Admin > User Management
   - Find user > Reset PIN
   - Share new PIN securely

4. **For system-wide issues:**
   - Check health endpoint: Database connected?
   - Check Supabase authentication logs
   - Check audit_trail table for failed login attempts
   - Look for rate limiting issues

**Prevention:**
- Document PIN reset process
- Keep admin credentials secure
- Monitor failed login attempts

---

### Incident 3: Data Loss or Corruption

**Symptoms:**
- Missing inspections
- Incorrect data in reports
- User reports data is gone

**⚠️ CRITICAL: Stop the application immediately to prevent further data loss**

**Recovery Steps:**

1. **Stop the application:**
   ```bash
   # Disable the site (put in maintenance mode)
   # Or stop the server if self-hosted
   ```

2. **Assess the damage:**
   - Check Supabase > Database > inspections table
   - Identify what data is missing/corrupted
   - Check when the issue started (audit_trail table)

3. **Restore from backup:**
   - Go to: https://app.supabase.com/project/ooriqpeqtfmgfynlbsxb/database/backups
   - Select most recent backup before the incident
   - Click "Restore"
   - Wait for restoration to complete (5-30 minutes)

4. **Verify data integrity:**
   - Check inspections count
   - Verify user data
   - Test key functionality

5. **Restart the application:**
   - Remove maintenance mode
   - Test thoroughly before notifying users

6. **Post-incident:**
   - Notify users of what happened
   - Explain what data was recovered
   - Ask users to verify their data

**Prevention:**
- Daily automated backups (configured in Supabase)
- Test restore process monthly
- Monitor data integrity

---

### Incident 4: Supabase Storage Full

**Symptoms:**
- Can't upload images
- "Storage limit exceeded" errors
- Slow performance

**Resolution:**

1. **Check current storage usage:**
   - Go to: https://app.supabase.com/project/ooriqpeqtfmgfynlbsxb/settings/billing
   - View storage usage

2. **Clean up old files:**
   ```bash
   # Option 1: Delete old temporary files
   # Go to Storage > Buckets > inspection-images
   # Sort by date, delete old files

   # Option 2: Upgrade Supabase plan
   # Go to Settings > Billing > Upgrade
   ```

3. **Implement image compression:**
   - Already implemented in `src/utils/imageCompression.ts`
   - Verify it's working

**Prevention:**
- Monitor storage usage weekly
- Set up alerts at 80% capacity
- Regular cleanup of old files

---

### Incident 5: Performance Degradation

**Symptoms:**
- Slow page loads
- Timeouts
- Users complain about speed

**Troubleshooting:**

1. **Check database performance:**
   - Supabase > Reports > Performance
   - Look for slow queries

2. **Check for heavy queries:**
   - Look at audit trail size
   - Check inspections table size

3. **Quick fixes:**
   - Clear browser cache (instruct users)
   - Restart application
   - Check if database needs indexing

**Prevention:**
- For 3-5 users, this should rarely happen
- Monitor database size monthly

---

## 🔐 Security Incidents

### Incident 6: Suspected Unauthorized Access

**Symptoms:**
- Unknown data changes
- Suspicious audit trail entries
- User reports actions they didn't take

**Immediate Actions:**

1. **Check audit trail:**
   ```sql
   SELECT * FROM audit_trail
   ORDER BY timestamp DESC
   LIMIT 100;
   ```

2. **Review recent logins:**
   ```sql
   SELECT * FROM users
   ORDER BY last_login DESC;
   ```

3. **If confirmed breach:**
   - Reset all user PINs immediately
   - Rotate JWT_SECRET in .env.local
   - Deploy new version
   - Notify all users to re-login

4. **Investigate:**
   - Check for SQL injection attempts
   - Review failed login attempts
   - Check IP addresses in logs

**Prevention:**
- Input validation (already implemented)
- Monitor audit trail weekly
- Keep dependencies updated

---

### Incident 7: Secrets Exposed

**Symptoms:**
- .env file accidentally committed to git
- Secrets visible in logs
- Third-party notifies you

**CRITICAL - Act immediately:**

1. **If in git, remove from history:**
   ```bash
   # Remove from current commit
   git rm --cached .env.local
   git commit -m "Remove sensitive file"

   # Remove from entire history (if already pushed)
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env.local" \
     --prune-empty --tag-name-filter cat -- --all

   git push --force --all
   ```

2. **Rotate ALL secrets immediately:**
   ```bash
   # Generate new JWT_SECRET (64 characters)
   openssl rand -hex 32

   # Rotate in .env.local:
   # - JWT_SECRET
   # - DO_SPACES_KEY and DO_SPACES_SECRET
   # - SUPABASE_SERVICE_ROLE_KEY (generate new in Supabase)
   ```

3. **Deploy with new secrets:**
   ```bash
   # Update .env.local
   # Deploy immediately
   git add next.config.js  # or other changes
   git commit -m "Security update"
   git push
   ```

4. **Notify affected services:**
   - Revoke old DigitalOcean keys
   - Monitor for suspicious activity

---

## 📝 Post-Incident Checklist

After resolving any incident:

- [ ] Document what happened
- [ ] Document what was done to fix it
- [ ] Notify users if needed
- [ ] Update this runbook with lessons learned
- [ ] Implement prevention measures
- [ ] Test that the fix works
- [ ] Schedule follow-up to ensure stability

---

## 🔄 Regular Maintenance

### Daily (Automated)
- [ ] Automated Supabase backup runs at 2 AM
- [ ] UptimeRobot checks health every 5 minutes

### Weekly (5 minutes)
- [ ] Check UptimeRobot dashboard (all green?)
- [ ] Review Supabase database size
- [ ] Quick scan of audit_trail for anomalies

### Monthly (30 minutes)
- [ ] Test backup restore process
- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Review storage usage
- [ ] Check for failed login patterns

### Quarterly (1 hour)
- [ ] Review and update this runbook
- [ ] Test all incident procedures
- [ ] Update dependencies
- [ ] Review user access (remove inactive users)

---

## 📊 Monitoring Dashboards

### Essential Links
- **Application:** https://your-domain.com
- **Health Check:** https://your-domain.com/api/health
- **Supabase Dashboard:** https://app.supabase.com/project/ooriqpeqtfmgfynlbsxb
- **Supabase Backups:** https://app.supabase.com/project/ooriqpeqtfmgfynlbsxb/database/backups
- **UptimeRobot:** https://uptimerobot.com
- **Hosting Platform:** [Your platform]

### Key Metrics to Watch
- Uptime: Target 99.9% (43 minutes downtime/month acceptable)
- Response time: < 2 seconds
- Database size: Monitor growth
- Storage usage: Stay under 80%
- Failed logins: < 5/day (3-5 users)

---

## 🎯 When to Escalate

For a small team of 3-5 users, most issues can be resolved by following this guide.

**Escalate to Supabase Support if:**
- Database is down for > 30 minutes
- Data corruption in Supabase
- Backup restore fails
- Performance degradation in Supabase

**Escalate to hosting platform if:**
- Deployment fails repeatedly
- Platform-level outage
- DNS issues

---

## 📚 Additional Resources

- **Supabase Documentation:** https://supabase.com/docs
- **Next.js Documentation:** https://nextjs.org/docs
- **Security Best Practices:** [SECURITY_IMPROVEMENTS.md](./SECURITY_IMPROVEMENTS.md)
- **One Week Plan:** [ONE_WEEK_SECURITY_PLAN.md](./ONE_WEEK_SECURITY_PLAN.md)

---

**Remember:** For 3-5 users, incidents should be rare. Most issues can be resolved quickly with these procedures.

**Last Updated:** 2025-12-05
**Next Review:** 2026-03-05 (3 months)
