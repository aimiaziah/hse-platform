# 🚀 DigitalOcean Deployment Guide - Step by Step

**For:** Pre-staging deployment on DigitalOcean App Platform  
**Repository:** https://github.com/aimiaziah/hse-platform  
**Status:** Ready for deployment

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure you have:

- [x] ✅ Health check endpoint fixed
- [x] ✅ DigitalOcean App Spec file (`.do/app.yaml`) ready
- [ ] ⏳ All code changes committed to GitHub
- [ ] ⏳ Local build succeeds (`npm run build`)
- [ ] ⏳ Supabase credentials ready
- [ ] ⏳ JWT secret generated

---

## 🔧 Step 1: Prepare Your Codebase

### 1.1 Test Local Build

```bash
# Make sure build works locally
npm ci
npm run build
npm start
```

**Expected:** Build completes without errors, app runs on `http://localhost:8080`

### 1.2 Test Health Endpoint Locally

```bash
# In another terminal
curl http://localhost:8080/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-09T...",
  "database": "connected",
  "version": "1.0.0",
  "uptime": 123
}
```

### 1.3 Commit All Changes

```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "feat: Prepare for DigitalOcean deployment

- Fix health endpoint database query
- Add DigitalOcean App Platform configuration
- Update deployment documentation
- Stage all pending changes"

# Push to GitHub
git push origin main
```

**Verify on GitHub:** Go to https://github.com/aimiaziah/pwa-inspection and confirm all files are pushed.

---

## 🌐 Step 2: Deploy to DigitalOcean

### 2.1 Create App via App Spec (Recommended)

1. **Go to DigitalOcean App Platform**
   - Visit: https://cloud.digitalocean.com/apps
   - Click **"Create App"**

2. **Select "Use App Spec"**
   - Choose **"Use App Spec"** option
   - You can either:
     - **Option A:** Upload `.do/app.yaml` file
     - **Option B:** Copy-paste contents of `.do/app.yaml`

3. **Connect GitHub Repository**
   - DigitalOcean will ask to connect GitHub
   - Authorize DigitalOcean to access your repositories
   - Select repository: `aimiaziah/hse-platform`
   - Select branch: `main`
   - Enable **"Autodeploy on push"** ✅

4. **Review Configuration**
   - Verify build command: `npm ci && npm run build`
   - Verify run command: `npm start`
   - Verify HTTP port: `8080`
   - Verify health check path: `/api/health`

### 2.2 Configure Environment Variables

**Go to:** Settings → App-Level Environment Variables

Add these **REQUIRED** variables (mark secrets as encrypted):

#### Core Configuration
| Variable | Value | Encrypted? | Notes |
|----------|-------|------------|-------|
| `NODE_ENV` | `production` | No | |
| `NODE_VERSION` | `18` | No | |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | **Yes** | From Supabase dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key | **Yes** | From Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service key | **Yes** | From Supabase dashboard |
| `JWT_SECRET` | Random 64-char string | **Yes** | Generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |

#### Authentication
| Variable | Value | Encrypted? |
|----------|-------|------------|
| `JWT_EXPIRES_IN` | `7d` | No |
| `ALLOWED_EMAIL_DOMAINS` | `theta-edge.com` | No |
| `ENABLE_PIN_AUTH` | `true` | No |
| `ENABLE_MICROSOFT_AUTH` | `true` | No |
| `PREFER_MICROSOFT_AUTH` | `true` | No |

#### Optional: DigitalOcean Spaces (for image storage)
| Variable | Value | Encrypted? |
|----------|-------|------------|
| `DO_SPACES_NAME` | `inspection-images` | No |
| `DO_SPACES_REGION` | `sgp1` | No |
| `DO_SPACES_ENDPOINT` | `https://sgp1.digitaloceanspaces.com` | No |
| `DO_SPACES_KEY` | Your Spaces key | **Yes** |
| `DO_SPACES_SECRET` | Your Spaces secret | **Yes** |

#### Application Info
| Variable | Value | Encrypted? |
|----------|-------|------------|
| `NEXT_PUBLIC_APP_NAME` | `PWA Inspection Platform` | No |
| `NEXT_PUBLIC_APP_VERSION` | `1.0.0` | No |
| `NEXT_TELEMETRY_DISABLED` | `1` | No |
| `LOG_LEVEL` | `info` | No |

### 2.3 Deploy

1. **Review Settings**
   - Double-check all environment variables
   - Verify instance size: `basic-xxs` ($5/month)
   - Verify region: `sgp` (Singapore)

2. **Click "Create Resources"**
   - First deployment takes **8-12 minutes**
   - You'll see build logs in real-time

3. **Monitor Deployment**
   - Watch build logs for errors
   - Health check starts after 20 seconds
   - Deployment completes when health check passes

---

## ✅ Step 3: Post-Deployment Verification

### 3.1 Check Deployment Status

1. **In DigitalOcean Dashboard:**
   - Go to your app
   - Check **"Deployments"** tab
   - Status should be **"Live"** ✅

2. **Get Your App URL:**
   - Your app URL: `https://your-app-name.ondigitalocean.app`
   - Note this URL for testing

### 3.2 Test Health Endpoint

```bash
curl https://your-app-name.ondigitalocean.app/api/health
```

**Expected:**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-09T...",
  "database": "connected",
  "version": "1.0.0",
  "uptime": 123
}
```

### 3.3 Functional Testing

Test these features in your deployed app:

#### Authentication
- [ ] **PIN Login:** Visit app → Enter PIN `0000` (admin) or `1234` (inspector)
- [ ] **Microsoft SSO:** Click Microsoft login (if configured)
- [ ] **Session Persistence:** Refresh page, should stay logged in

#### Core Features
- [ ] **Create Inspection:** Inspector role → Create fire extinguisher inspection
- [ ] **View Inspections:** See list of inspections
- [ ] **Image Upload:** Upload image during inspection
- [ ] **Export Excel:** Export inspection to Excel
- [ ] **Export PDF:** Export inspection to PDF

#### Role-Based Access
- [ ] **Inspector:** Can create/view own inspections
- [ ] **Supervisor:** Can review inspections
- [ ] **Admin:** Can manage users

#### PWA Features
- [ ] **Install PWA:** Browser should show "Install" prompt
- [ ] **Offline Mode:** Disable network → App should work offline
- [ ] **Service Worker:** Check browser DevTools → Application → Service Workers

### 3.4 Security Checks

- [ ] **HTTPS:** URL should be `https://` (not `http://`)
- [ ] **Security Headers:** Check with https://securityheaders.com
- [ ] **No Console Errors:** Open DevTools → Console (should be clean)
- [ ] **No Secrets Exposed:** View page source → Search for "supabase" → Should not see keys

---

## 🔍 Step 4: Testing Strategy

### Recommended Approach: Deploy → Test → Modify

**Yes, it's best to deploy first, then test and modify!** Here's why:

1. **Real Environment Testing:** Production environment differs from local
2. **Mobile Testing:** You can test on actual mobile devices (not just Piggy)
3. **Performance:** See real-world performance
4. **User Feedback:** Get feedback from actual users
5. **Iterative Improvement:** Fix issues as you find them

### Testing Workflow

```
Deploy → Test → Identify Issues → Fix Locally → Push → Auto-Deploy → Test Again
```

### Mobile Testing Tips

1. **Access on Mobile:**
   - Open `https://your-app-name.ondigitalocean.app` on your phone
   - Add to home screen (PWA install)
   - Test all features on mobile

2. **Compare with Piggy:**
   - Test same features on both Piggy (local) and production
   - Note any differences
   - Fix production issues

3. **Test Offline:**
   - Enable airplane mode
   - App should still work (cached)
   - Create inspection offline
   - Re-enable network → Should sync

---

## 🐛 Step 5: Troubleshooting Common Issues

### Issue: Build Fails

**Symptoms:** Build logs show errors

**Solutions:**
1. Check build logs for specific error
2. Common issues:
   - **TypeScript errors:** Fix in code, commit, push
   - **Missing dependencies:** Check `package.json`
   - **Memory issues:** Upgrade instance size temporarily
3. Fix locally first: `npm run build`
4. Push fix: `git push origin main`

### Issue: Health Check Fails

**Symptoms:** Deployment shows "Unhealthy"

**Solutions:**
1. Check health endpoint manually: `curl https://your-app/api/health`
2. Check Supabase connection:
   - Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
   - Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
   - Check Supabase project is not paused
3. Check runtime logs in DigitalOcean dashboard

### Issue: App Crashes on Startup

**Symptoms:** App deploys but crashes immediately

**Solutions:**
1. Check runtime logs in DigitalOcean
2. Common causes:
   - Missing environment variables
   - Invalid Supabase credentials
   - Port mismatch (should be 8080)
3. Verify all required env vars are set

### Issue: Database Connection Fails

**Symptoms:** Health check shows `"database": "disconnected"`

**Solutions:**
1. Verify Supabase credentials in environment variables
2. Check Supabase project status: https://status.supabase.com
3. Verify IP allowlist in Supabase (if configured)
4. Test connection locally with same credentials

### Issue: Images Not Loading

**Symptoms:** Images show broken/placeholder

**Solutions:**
1. If using DigitalOcean Spaces:
   - Verify `DO_SPACES_*` environment variables
   - Check CORS configuration on Spaces
   - Verify bucket is public
2. If using Supabase Storage:
   - Verify storage policies are set
   - Check bucket permissions

---

## 🔄 Step 6: Making Updates

### Workflow for Updates

1. **Make Changes Locally**
   ```bash
   # Make your changes
   # Test locally
   npm run dev
   ```

2. **Test Build**
   ```bash
   npm run build
   ```

3. **Commit and Push**
   ```bash
   git add .
   git commit -m "fix: Description of fix"
   git push origin main
   ```

4. **Auto-Deploy**
   - DigitalOcean automatically detects push
   - Starts new deployment
   - Takes 3-5 minutes
   - Old version stays live until new one is healthy

5. **Verify**
   - Check deployment status
   - Test the fix
   - Monitor for issues

### Rollback if Needed

If new deployment has issues:

1. **Quick Rollback:**
   - Go to Deployments tab
   - Find last working deployment
   - Click **"Rollback"**

2. **Code Rollback:**
   ```bash
   git revert HEAD
   git push origin main
   ```

---

## 📊 Step 7: Monitoring & Maintenance

### Set Up Monitoring

1. **DigitalOcean Alerts:**
   - Go to Settings → Alerts
   - Enable:
     - Deployment failed
     - Deployment live
     - High CPU (>80%)
     - High memory (>80%)

2. **External Monitoring (Optional):**
   - UptimeRobot (free): https://uptimerobot.com
   - Monitor: `https://your-app/api/health`
   - Interval: 5 minutes

### Regular Maintenance

**Weekly (5 minutes):**
- Check deployment status
- Review error logs
- Check Supabase health

**Monthly (30 minutes):**
- Run `npm audit` locally
- Update dependencies if needed
- Review user feedback
- Test backup restore (if configured)

---

## 💰 Cost Information

### Current Setup

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| DigitalOcean App Platform | Basic (512MB) | $5 |
| DigitalOcean Spaces | 250GB + 1TB transfer | $0* |
| Supabase | Free tier | $0 |
| **Total** | | **$5/month** |

*Included in GitHub Student Pack $200 credit

### With GitHub Student Pack

- $200 DigitalOcean credit = **40 months free** (for $5/month app)
- Or use for higher tier if needed

---

## 📝 Quick Reference

### Important URLs

- **DigitalOcean Dashboard:** https://cloud.digitalocean.com/apps
- **GitHub Repository:** https://github.com/aimiaziah/hse-platform
- **Supabase Dashboard:** https://app.supabase.com
- **App URL:** `https://your-app-name.ondigitalocean.app`

### Important Commands

```bash
# Local development
npm run dev          # Start dev server
npm run build        # Test build
npm start            # Test production build

# Git workflow
git add .            # Stage changes
git commit -m "..."  # Commit
git push origin main # Push to GitHub (triggers auto-deploy)

# Health check
curl https://your-app/api/health
```

### Environment Variables Quick Reference

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`

**Optional but Recommended:**
- `DO_SPACES_*` (for image storage)
- `NEXT_PUBLIC_SHAREPOINT_*` (for SharePoint integration)

---

## 🎯 Next Steps After Deployment

1. ✅ **Test thoroughly** on mobile devices
2. ✅ **Share with users** for feedback
3. ✅ **Monitor** for issues
4. ✅ **Iterate** based on feedback
5. ✅ **Document** any custom configurations

---

## 🆘 Need Help?

- **Deployment Issues:** Check `DIGITALOCEAN_DEPLOYMENT.md` for detailed troubleshooting
- **Build Issues:** Check build logs in DigitalOcean dashboard
- **Runtime Issues:** Check runtime logs in DigitalOcean dashboard
- **GitHub Issues:** https://github.com/aimiaziah/hse-platform/issues

---

**Last Updated:** 2024-12-09  
**Status:** ✅ Ready for Deployment  
**Estimated Deployment Time:** 10-15 minutes (first time)

