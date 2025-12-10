# DigitalOcean Deployment Guide

Complete guide for deploying the PWA Inspection Platform to DigitalOcean App Platform.

## Prerequisites

- [x] DigitalOcean account (get $200 free credit with [GitHub Student Developer Pack](https://education.github.com/pack))
- [x] GitHub repository connected to DigitalOcean
- [x] Supabase project set up
- [x] DigitalOcean Spaces configured (optional, for image storage)

---

## Quick Start

### Option 1: Deploy via App Spec File (Recommended)

1. **Push the `.do/app.yaml` file to your repository**
   ```bash
   git add .do/app.yaml
   git commit -m "Add DigitalOcean App Platform configuration"
   git push origin main
   ```

2. **Create app from spec file**
   - Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
   - Click "Create App"
   - Select "Use App Spec" option
   - Paste the contents of `.do/app.yaml` or upload the file
   - Click "Next" and follow the wizard

3. **Configure environment variables** (see [Environment Variables](#environment-variables) section below)

4. **Deploy**
   - Review settings
   - Click "Create Resources"
   - Wait for deployment (5-10 minutes)

### Option 2: Deploy via UI

1. **Create a new App**
   - Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
   - Click "Create App"
   - Connect your GitHub repository: `aimiaziah/hse-platform`
   - Select branch: `main`
   - Enable "Autodeploy" for automatic deployments on push

2. **Configure Build Settings**
   - **Build Command**: `npm ci && npm run build`
   - **Run Command**: `npm start`
   - **HTTP Port**: `8080`
   - **Environment**: Node.js
   - **Node Version**: 18

3. **Configure Resources**
   - **Instance Type**: Basic (512 MB RAM, 1 vCPU) - $5/month
   - **Instance Count**: 1

4. **Configure Health Checks**
   - **HTTP Path**: `/api/health`
   - **Initial Delay**: 20 seconds
   - **Period**: 10 seconds
   - **Timeout**: 5 seconds

5. **Set Environment Variables** (see section below)

6. **Deploy**

---

## Environment Variables

Configure these in the DigitalOcean App Platform dashboard under **Settings → App-Level Environment Variables**.

### Required Variables

| Variable | Value | Encrypted? | Notes |
|----------|-------|------------|-------|
| `NODE_ENV` | `production` | No | Required for production optimizations |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | Yes | From Supabase project settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | Yes | From Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | Yes | From Supabase project settings |
| `JWT_SECRET` | Random 64-char string | Yes | Generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |

### Authentication Variables

| Variable | Value | Encrypted? | Notes |
|----------|-------|------------|-------|
| `JWT_EXPIRES_IN` | `7d` | No | Token expiration (7 days) |
| `ALLOWED_EMAIL_DOMAINS` | `theta-edge.com` | No | Comma-separated email domains |
| `ENABLE_PIN_AUTH` | `true` | No | Enable PIN-based login |
| `ENABLE_MICROSOFT_AUTH` | `true` | No | Enable Microsoft SSO |
| `PREFER_MICROSOFT_AUTH` | `true` | No | Show Microsoft as default |

### Optional: DigitalOcean Spaces (Image Storage)

| Variable | Value | Encrypted? | Notes |
|----------|-------|------------|-------|
| `DO_SPACES_NAME` | `inspection-images` | No | Your Spaces bucket name |
| `DO_SPACES_REGION` | `sgp1` | No | Singapore region (or your region) |
| `DO_SPACES_ENDPOINT` | `https://sgp1.digitaloceanspaces.com` | No | Region endpoint |
| `DO_SPACES_KEY` | Your Spaces access key | Yes | From API → Spaces Keys |
| `DO_SPACES_SECRET` | Your Spaces secret | Yes | From API → Spaces Keys |

### Optional: SharePoint Integration

| Variable | Value | Encrypted? | Notes |
|----------|-------|------------|-------|
| `NEXT_PUBLIC_SHAREPOINT_OAUTH_CLIENT_ID` | Your Azure app client ID | Yes | Optional |
| `NEXT_PUBLIC_SHAREPOINT_TENANT_ID` | `common` | No | Or your tenant ID |
| `NEXT_PUBLIC_SHAREPOINT_SITE_URL` | Your SharePoint site | No | Optional |

---

## Post-Deployment Steps

### 1. Verify Health Check

```bash
curl https://your-app.ondigitalocean.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected",
  "version": "1.0.0",
  "uptime": 123
}
```

### 2. Test Authentication

1. Visit your app URL: `https://your-app.ondigitalocean.app`
2. Try logging in with PIN or Microsoft SSO
3. Verify role-based access (Inspector, Supervisor, Admin)

### 3. Configure Custom Domain (Optional)

1. Go to **Settings → Domains**
2. Add your custom domain
3. Update DNS records (CNAME or A record)
4. Wait for SSL certificate provisioning (automatic)

### 4. Enable HTTPS Redirect

In App Platform settings:
- **Settings → HTTPS**: Enable "Force HTTPS"
- This redirects all HTTP traffic to HTTPS

### 5. Configure Alerts

Recommended alerts:
- Deployment failed
- Deployment live
- High CPU usage (>80%)
- High memory usage (>80%)
- Domain failed

---

## Troubleshooting

### Build Failures

#### Issue: TypeScript build errors

**Solution**: Ensure TypeScript is in dependencies (already fixed in package.json)

```json
{
  "dependencies": {
    "typescript": "4.9.5"
  }
}
```

#### Issue: Native dependencies fail (`sharp`, `bcrypt`)

**Solution**: DigitalOcean automatically handles native dependencies. If issues persist:

1. Check build logs in App Platform console
2. Ensure Node version is 18 (set `NODE_VERSION=18` in build env vars)

#### Issue: Out of memory during build

**Solution**: Upgrade instance size temporarily during build:
- Go to **Settings → Resources**
- Increase to Professional tier during build
- Scale back down after successful deployment

### Runtime Failures

#### Issue: Application crashes immediately

**Check**:
1. Build logs for errors
2. Runtime logs in App Platform console
3. Health check endpoint status
4. Environment variables are set correctly

#### Issue: Database connection fails

**Check**:
1. Supabase credentials are correct
2. Supabase project is not paused
3. IP allowlist in Supabase (if configured)
4. Health check shows database status

#### Issue: Images not loading

**Check**:
1. DigitalOcean Spaces credentials
2. CORS configuration on Spaces
3. Public access enabled on Spaces bucket
4. Environment variables: `DO_SPACES_*`

### Performance Issues

#### Issue: Slow response times

**Solutions**:
1. Upgrade instance size
2. Enable CDN (in App Platform settings)
3. Optimize images (use Next.js Image component)
4. Check Supabase query performance

#### Issue: App sleeps/cold starts

**Note**: Basic tier apps don't sleep. If using free tier during development:
- Upgrade to Basic ($5/month) for always-on
- Or accept 30-second cold start

---

## Scaling

### Horizontal Scaling

Add more instances:
1. Go to **Settings → Resources**
2. Increase **Instance Count**
3. Load balancing is automatic

### Vertical Scaling

Upgrade instance size:
- **Basic**: 512 MB RAM ($5/month) - Good for 5-10 users
- **Professional XS**: 1 GB RAM ($12/month) - 10-50 users
- **Professional S**: 2 GB RAM ($24/month) - 50-200 users

### Database Scaling

Supabase free tier limits:
- 500 MB database
- 1 GB bandwidth/month
- 2 GB file storage

Upgrade Supabase if needed.

---

## Cost Optimization

### Current Setup (Estimated Monthly)

| Service | Plan | Cost |
|---------|------|------|
| DigitalOcean App Platform | Basic (512MB) | $5 |
| DigitalOcean Spaces | 250 GB + 1 TB transfer | Included in $200 credit |
| Supabase | Free tier | $0 |
| **Total** | | **$5/month** |

### With GitHub Student Pack

- $200 DigitalOcean credit = **40 months free** (for $5/month app)
- Or use for 20 months with Professional tier

### Tips

1. Use DigitalOcean Spaces instead of Supabase Storage (zero egress fees)
2. Start with Basic tier, scale when needed
3. Monitor usage in DigitalOcean dashboard
4. Set up billing alerts

---

## Monitoring & Logging

### Application Logs

View in App Platform:
1. Select your app
2. Click **Runtime Logs**
3. Filter by service, time range

### Metrics

Available metrics:
- CPU usage
- Memory usage
- Request count
- Response time
- Error rate

### Security Monitoring

GitHub Actions runs security pipeline on every push:
- Secret detection (TruffleHog)
- Dependency scanning (npm audit)
- SAST (Semgrep)
- Build verification

View results in **Actions** tab on GitHub.

---

## Deployment Workflow

### Automatic Deployments

When you push to `main` branch:
1. GitHub Actions runs security pipeline
2. If passed, DigitalOcean auto-deploys
3. Health check validates deployment
4. Traffic switches to new version

### Manual Deployments

Trigger manually in App Platform:
1. Go to your app
2. Click **Actions → Force Rebuild and Deploy**

### Rollback

If deployment fails:
1. Go to **Deployments** tab
2. Find last working deployment
3. Click **Rollback**

---

## Security Best Practices

### Environment Variables

- [x] All secrets encrypted in App Platform
- [x] JWT secret is strong (64+ characters)
- [x] Service role key never exposed to client
- [x] Environment variables not in source code

### HTTPS

- [x] Force HTTPS enabled
- [x] HSTS headers configured (see `next.config.js`)
- [x] Automatic SSL certificate

### Headers

Security headers configured in `next.config.js`:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Content-Security-Policy
- Strict-Transport-Security

### Authentication

- [x] JWT tokens with expiration
- [x] Rate limiting on auth endpoints
- [x] Email domain whitelist
- [x] Role-based access control

---

## Next Steps

After successful deployment:

1. **Test all features**
   - Authentication (PIN & Microsoft)
   - Inspections (create, edit, delete)
   - Export (Excel, PDF)
   - Image upload
   - Offline functionality

2. **Configure backup strategy**
   - Supabase automatic backups
   - Export data regularly
   - Document recovery procedures

3. **Set up monitoring**
   - Configure alerts
   - Set up uptime monitoring (e.g., UptimeRobot)
   - Monitor error logs

4. **User training**
   - Create user documentation
   - Train users on new features
   - Collect feedback

---

## Support

- **DigitalOcean Docs**: https://docs.digitalocean.com/products/app-platform/
- **GitHub Issues**: https://github.com/aimiaziah/hse-platform/issues
- **Supabase Docs**: https://supabase.com/docs

---

## Changelog

- **2024-12-09**: Initial deployment guide created
- **2024-12-09**: Added App Spec configuration (`.do/app.yaml`)
- **2024-12-09**: Documented environment variables and troubleshooting
