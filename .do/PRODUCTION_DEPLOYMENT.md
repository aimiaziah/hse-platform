# Production Deployment Guide

This guide covers deploying the PWA Inspection Platform to **production** on DigitalOcean App Platform.

## ✅ Pre-Deployment Checklist

Before deploying to production, ensure:

- [x] All code is committed and pushed to `main` branch
- [x] Local build succeeds: `npm run build`
- [x] All TypeScript errors are resolved
- [x] Environment variables are ready (see below)
- [x] Supabase production database is configured
- [x] Microsoft OAuth app is configured with production redirect URL
- [x] JWT secret is generated and secure

## 🚀 Deployment Steps

### Step 1: Push Configuration to GitHub

```bash
git add .do/app.yaml
git commit -m "feat: Configure production deployment on DigitalOcean"
git push origin main
```

### Step 2: Deploy via DigitalOcean App Platform

1. **Go to DigitalOcean App Platform**
   - Visit: https://cloud.digitalocean.com/apps
   - Click **"Create App"** (or edit existing app)

2. **Use App Spec File**
   - Select **"Use App Spec"** option
   - Upload `.do/app.yaml` or paste its contents
   - Click **"Next"**

3. **Connect GitHub Repository**
   - Authorize DigitalOcean to access your repositories
   - Select repository: `aimiaziah/hse-platform`
   - Select branch: `main`
   - Enable **"Autodeploy on push"** ✅

### Step 3: Configure Production Environment Variables

**Go to:** Settings → App-Level Environment Variables

#### Required Secrets (Mark as Encrypted)

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | From Supabase dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key | From Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service key | From Supabase dashboard |
| `JWT_SECRET` | 64+ character random string | Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `NEXT_PUBLIC_SHAREPOINT_OAUTH_CLIENT_ID` | Azure app client ID | From Azure Portal |
| `DO_SPACES_KEY` | Spaces access key | Optional - for image storage |
| `DO_SPACES_SECRET` | Spaces secret | Optional - for image storage |

#### Production Configuration

All other variables are already set in `app.yaml`:
- `NODE_ENV=production` ✅
- `ENABLE_MICROSOFT_AUTH=true` ✅
- `ENABLE_PIN_AUTH=true` ✅
- `ALLOWED_EMAIL_DOMAINS=theta-edge.com` ✅
- Rate limiting configured ✅

### Step 4: Update Microsoft OAuth Redirect URL

After deployment, update your Azure App Registration:

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **App registrations** → Your app
3. Go to **Authentication**
4. Add redirect URI: `https://your-app-name.ondigitalocean.app/api/auth/microsoft/callback`
5. Save changes

### Step 5: Deploy

1. **Review Settings**
   - Verify all environment variables are set
   - Check instance size (consider upgrading for production)
   - Verify health check path: `/api/health`

2. **Create Resources**
   - Click **"Create Resources"**
   - First deployment takes **8-12 minutes**
   - Monitor build logs for errors

3. **Wait for Deployment**
   - Build phase: ~5-8 minutes
   - Health check starts after 20 seconds
   - Deployment completes when health check passes

## 🔍 Post-Deployment Verification

### 1. Check Deployment Status

- Go to DigitalOcean App Platform dashboard
- Verify status shows **"Live"**
- Check recent deployment logs for errors

### 2. Test Health Endpoint

```bash
curl https://your-app-name.ondigitalocean.app/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-10T...",
  "database": "connected",
  "version": "1.0.0",
  "uptime": 123
}
```

### 3. Test Production Features

- [ ] **Authentication:** Test PIN login and Microsoft SSO
- [ ] **Create Inspection:** Test creating a new inspection
- [ ] **Image Upload:** Test uploading images
- [ ] **Export:** Test Excel and PDF export
- [ ] **PWA Install:** Test installing as PWA on mobile
- [ ] **Offline Mode:** Test app functionality offline

### 4. Security Checks

- [ ] **HTTPS:** Verify URL uses `https://`
- [ ] **No Console Errors:** Check browser DevTools
- [ ] **No Secrets Exposed:** Verify no API keys in page source
- [ ] **Security Headers:** Check with https://securityheaders.com

## 📊 Production Monitoring

### DigitalOcean Monitoring

- **Alerts:** Configured for deployment failures and domain issues
- **Logs:** Available in App Platform dashboard
- **Metrics:** CPU, memory, and request metrics available

### Recommended Monitoring

1. **Set up uptime monitoring** (e.g., UptimeRobot, Pingdom)
2. **Monitor error rates** in DigitalOcean logs
3. **Track performance metrics** (response times, request counts)
4. **Set up alerts** for critical failures

## 🔧 Production Optimizations

### Instance Sizing

Current: `basic-xxs` ($5/month)
- **512MB RAM, 1 vCPU**
- Suitable for: Small production apps (< 100 users)

**Consider upgrading if:**
- High traffic (> 100 concurrent users)
- Slow response times
- Memory errors in logs

**Recommended upgrades:**
- `basic-xs`: $12/month (1GB RAM) - Moderate traffic
- `basic-s`: $24/month (2GB RAM) - Higher traffic

### Performance Tips

1. **Enable caching** for static assets
2. **Use CDN** for images (DigitalOcean Spaces)
3. **Monitor database queries** for optimization
4. **Enable compression** (Next.js handles this automatically)

## 🚨 Troubleshooting Production Issues

### Build Fails

1. Check build logs in DigitalOcean dashboard
2. Fix TypeScript errors locally
3. Test build: `npm run build`
4. Push fix: `git push origin main`

### Health Check Fails

1. Check `/api/health` endpoint manually
2. Verify Supabase connection
3. Check environment variables
4. Review application logs

### Authentication Issues

1. Verify Microsoft OAuth redirect URL matches production URL
2. Check `ALLOWED_EMAIL_DOMAINS` is correct
3. Verify JWT_SECRET is set
4. Check rate limiting isn't blocking legitimate users

### Performance Issues

1. Check instance CPU/memory usage
2. Consider upgrading instance size
3. Review database query performance
4. Check for memory leaks in logs

## 📝 Production Maintenance

### Regular Tasks

- **Weekly:** Review error logs and metrics
- **Monthly:** Update dependencies (`npm audit`)
- **Quarterly:** Review and optimize instance sizing
- **As needed:** Update environment variables

### Updates and Deployments

1. Make changes locally
2. Test thoroughly
3. Commit and push to `main` branch
4. DigitalOcean auto-deploys (if enabled)
5. Monitor deployment logs
6. Verify health check passes

## 🔐 Production Security Checklist

- [x] All secrets marked as encrypted in DigitalOcean
- [x] HTTPS enabled (automatic on DigitalOcean)
- [x] Rate limiting configured
- [x] Email domain whitelist enabled
- [x] JWT tokens with secure expiration
- [x] HttpOnly cookies for authentication
- [x] Security headers configured (Next.js default)
- [x] No sensitive data in logs

## 📞 Support

If you encounter issues:

1. Check DigitalOcean App Platform logs
2. Review deployment guide: `DEPLOYMENT_GUIDE.md`
3. Check troubleshooting section above
4. Review DigitalOcean documentation

---

**Last Updated:** December 2024
**Status:** Production Ready ✅

