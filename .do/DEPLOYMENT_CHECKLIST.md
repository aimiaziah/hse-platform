# DigitalOcean Deployment Checklist

Quick checklist for deploying to DigitalOcean App Platform.

## Pre-Deployment

- [ ] Supabase project is set up and running
- [ ] Supabase credentials ready (URL, anon key, service role key)
- [ ] JWT secret generated (64+ characters)
- [ ] GitHub repository is up to date
- [ ] All tests pass locally
- [ ] Build succeeds locally (`npm run build`)

## Deployment Steps

### 1. Push Configuration to GitHub

```bash
git add .do/app.yaml
git add DIGITALOCEAN_DEPLOYMENT.md
git commit -m "feat: Add DigitalOcean deployment configuration"
git push origin main
```

### 2. Create App in DigitalOcean

**Option A: Via App Spec (Recommended)**
1. Go to https://cloud.digitalocean.com/apps
2. Click "Create App"
3. Select "Use App Spec"
4. Upload `.do/app.yaml` or paste its contents
5. Click "Next"

**Option B: Via UI**
1. Go to https://cloud.digitalocean.com/apps
2. Click "Create App"
3. Connect GitHub repo: `aimiaziah/pwa-inspection`
4. Select branch: `main`
5. Configure build settings (see DIGITALOCEAN_DEPLOYMENT.md)

### 3. Configure Environment Variables

Go to Settings → App-Level Environment Variables and add:

**Required:**
- [ ] `NODE_ENV` = `production`
- [ ] `NEXT_PUBLIC_SUPABASE_URL` = `<your-supabase-url>` (encrypt)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `<your-anon-key>` (encrypt)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = `<your-service-key>` (encrypt)
- [ ] `JWT_SECRET` = `<64-char-random-string>` (encrypt)

**Authentication:**
- [ ] `JWT_EXPIRES_IN` = `7d`
- [ ] `ALLOWED_EMAIL_DOMAINS` = `theta-edge.com`
- [ ] `ENABLE_PIN_AUTH` = `true`
- [ ] `ENABLE_MICROSOFT_AUTH` = `true`
- [ ] `PREFER_MICROSOFT_AUTH` = `true`

**Optional (DigitalOcean Spaces):**
- [ ] `DO_SPACES_NAME` = `inspection-images`
- [ ] `DO_SPACES_REGION` = `sgp1`
- [ ] `DO_SPACES_ENDPOINT` = `https://sgp1.digitaloceanspaces.com`
- [ ] `DO_SPACES_KEY` = `<your-spaces-key>` (encrypt)
- [ ] `DO_SPACES_SECRET` = `<your-spaces-secret>` (encrypt)

### 4. Deploy

- [ ] Review configuration
- [ ] Click "Create Resources"
- [ ] Wait for build (5-10 minutes)
- [ ] Check deployment status

## Post-Deployment Verification

### Health Check
```bash
curl https://your-app.ondigitalocean.app/api/health
```

Expected: `{"status":"healthy","database":"connected"}`

### Functional Tests
- [ ] App loads successfully
- [ ] Can log in with PIN
- [ ] Can log in with Microsoft (if configured)
- [ ] Inspector can create inspection
- [ ] Supervisor can review inspection
- [ ] Admin can manage users
- [ ] Image upload works
- [ ] Excel export works
- [ ] PDF export works
- [ ] Offline mode works (test PWA)

### Security Checks
- [ ] HTTPS is enforced
- [ ] Security headers present (check with https://securityheaders.com)
- [ ] No secrets exposed in client bundle
- [ ] Health endpoint doesn't expose sensitive data

## Configuration (Optional)

### Custom Domain
- [ ] Add custom domain in Settings → Domains
- [ ] Update DNS records (CNAME or A record)
- [ ] Wait for SSL certificate (automatic)
- [ ] Test domain access

### Alerts
- [ ] Deployment failed alert
- [ ] High CPU alert (>80%)
- [ ] High memory alert (>80%)
- [ ] Health check failure alert

### Monitoring
- [ ] Set up external uptime monitoring (e.g., UptimeRobot)
- [ ] Configure log aggregation (if needed)
- [ ] Set up error tracking (e.g., Sentry - optional)

## Troubleshooting

If deployment fails, check:
1. Build logs in App Platform console
2. Environment variables are set correctly
3. Supabase credentials are correct
4. Health check endpoint is responding
5. See DIGITALOCEAN_DEPLOYMENT.md for detailed troubleshooting

## Rollback Plan

If something goes wrong:
1. Go to Deployments tab
2. Find last working deployment
3. Click "Rollback"

Or manually revert code:
```bash
git revert HEAD
git push origin main
```

## Cost Estimate

| Item | Cost |
|------|------|
| App Platform (Basic) | $5/month |
| Spaces (with student pack) | $0 (included in $200 credit) |
| Supabase (Free tier) | $0 |
| **Total** | **$5/month** |

With GitHub Student Pack: **40 months free** ($200 credit ÷ $5/month)

## Support Resources

- Full guide: `DIGITALOCEAN_DEPLOYMENT.md`
- DigitalOcean docs: https://docs.digitalocean.com/products/app-platform/
- GitHub issues: https://github.com/aimiaziah/pwa-inspection/issues
- Supabase docs: https://supabase.com/docs

## Notes

- First deployment takes 8-12 minutes
- Subsequent deployments take 3-5 minutes
- Health check starts after 20 seconds
- Auto-deploy triggers on push to `main`
- Build requires ~400MB memory (Basic tier is fine)

---

**Last Updated**: 2024-12-09
