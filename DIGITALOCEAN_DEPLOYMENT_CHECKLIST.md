# DigitalOcean Deployment Checklist

## ✅ Pre-Deployment Setup

### 1. Repository Selected
- [x] Repo visible in DigitalOcean
- [ ] Correct repo: `aimiaziah/pwa-inspection`
- [ ] Branch: `main`
- [ ] Autodeploy: Enabled ✅

---

## ⚙️ Configuration Settings

### 2. App Settings
- [ ] App Name: `inspection-app-pre-staging`
- [ ] Region: Choose closest (NYC, Singapore, Frankfurt, etc.)
- [ ] Plan: Basic ($5/month) for pre-staging

### 3. Build Settings
- [ ] Build Command: `npm run build`
- [ ] Run Command: `npm start`
- [ ] **HTTP Port: `8080`** ⚠️ CRITICAL - Must be 8080, not 3000!

### 4. Environment Variables ⚠️ CRITICAL

Add these in DigitalOcean (get values from your `.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL
Value: https://your-project.supabase.co
Encrypted: No (public variable)

NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp...
Encrypted: No (public variable)

SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp...
Encrypted: YES ✅ (secret key - encrypt this!)

NODE_ENV
Value: production
Encrypted: No
```

**How to add:**
1. Click "Edit" next to Environment Variables
2. Click "Add Variable"
3. Enter key and value
4. For `SUPABASE_SERVICE_ROLE_KEY`: Check "Encrypt" ✅
5. Click "Save"

---

## 🚀 Deployment Process

### 5. Deploy
- [ ] Review all settings above
- [ ] Click "Create Resources"
- [ ] Wait 5-10 minutes

### 6. Monitor Deployment
Watch the build logs for:
- [ ] Dependencies installing
- [ ] Build completing successfully
- [ ] Deployment starting
- [ ] Status: "Live" ✅

---

## ✅ Post-Deployment Verification

### 7. Test the URL
DigitalOcean will give you: `https://inspection-app-xxxxx.ondigitalocean.app`

Test:
- [ ] URL loads (not 404)
- [ ] Login page appears
- [ ] Can log in with test credentials
- [ ] Can create inspection
- [ ] Can export to Excel
- [ ] Images load correctly
- [ ] All features working

### 8. Check Logs (if issues)
- [ ] Go to app in DigitalOcean
- [ ] Click "Runtime Logs"
- [ ] Look for errors

---

## 🔧 Troubleshooting

### Build Failed?

**Check build logs for:**
- Missing dependencies → Run `npm install` locally first
- Environment variables missing → Add them in DigitalOcean
- TypeScript errors → Should not happen (we disabled strict checks)

**Common fixes:**
```bash
# Locally test the build
npm run build

# If it works locally but fails on DO:
# - Check Node.js version (DigitalOcean uses Node 18)
# - Verify all env vars are set in DO
```

### App Not Starting?

**Check:**
- [ ] HTTP Port is `8080` (not 3000)
- [ ] Run command is `npm start`
- [ ] Environment variables are all set

### App Loads but Features Don't Work?

**Check:**
- [ ] All environment variables correct
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is marked as encrypted
- [ ] Values copied correctly (no extra spaces)
- [ ] Supabase URL is correct

### Connection Errors?

**Check Runtime Logs:**
- Go to app → Runtime Logs
- Look for:
  - Supabase connection errors
  - Missing API keys
  - Database connection issues

---

## 💰 Cost Tracking

### Current Setup:
- **Basic Plan:** $5/month
- **Includes:**
  - 512 MB RAM
  - Always on (no cold starts)
  - 1 TB bandwidth
  - Automatic SSL
  - Auto-deployments from GitHub

### To Check Costs:
- Go to: https://cloud.digitalocean.com/billing
- View current month usage
- Set up billing alerts if needed

---

## 🔄 Making Updates

### After Initial Deployment:

**To deploy changes:**
1. Make code changes locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```
3. DigitalOcean auto-deploys! (if autodeploy enabled)
4. Wait 3-5 minutes for new deployment

**To update environment variables:**
1. Go to app in DigitalOcean
2. Settings → Environment Variables
3. Edit → Update → Save
4. App will automatically redeploy

---

## 🎯 Success Criteria

Your deployment is successful when:
- [x] Build completed without errors
- [x] App status shows "Live"
- [x] URL is accessible
- [x] Can log in
- [x] Can create and export inspections
- [x] All features working as expected

---

## 📞 If You're Stuck

**Check these in order:**
1. Build logs (in DigitalOcean)
2. Runtime logs (in DigitalOcean)
3. Environment variables (all set correctly?)
4. HTTP Port (must be 8080)
5. Supabase connection (keys correct?)

**Common Errors:**

| Error | Fix |
|-------|-----|
| "Port 3000 failed" | Change HTTP Port to 8080 |
| "Build failed" | Check build logs, run `npm run build` locally |
| "Cannot connect to Supabase" | Check environment variables |
| "404 Not Found" | App not deployed, check deployment status |

---

Last Updated: 2025-12-08
