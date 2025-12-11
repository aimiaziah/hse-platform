# DigitalOcean Deployment Setup Guide

## Issue: "No Repo Detected" - Quick Fix

### Method 1: Re-authorize GitHub (Recommended)

1. **Go to DigitalOcean:**
   - https://cloud.digitalocean.com/apps
   - Click "Create App" → "GitHub"

2. **When prompted to sign in:**
   - Sign in with the GitHub account that has access to `pwa-inspection`
   - (Either your main account or the collaborator account)

3. **On the GitHub authorization page:**
   - You'll see: "DigitalOcean would like permission to access your repositories"
   - Select "Only select repositories"
   - Click dropdown and find `aimiaziah/pwa-inspection`
   - If you don't see it, the account doesn't have access
   - Click "Install & Authorize"

4. **Back in DigitalOcean:**
   - The repo should now appear in the list!

---

### Method 2: Update GitHub App Permissions

If already connected but repo not showing:

1. **Go to GitHub:**
   - https://github.com/settings/installations

2. **Find "DigitalOcean" and click "Configure"**

3. **Under "Repository access":**
   - Select "Only select repositories"
   - Add `aimiaziah/pwa-inspection` to the list
   - Click "Save"

4. **Refresh DigitalOcean** - repo should appear

---

### Method 3: Use Main Account (Simplest)

If collaborator setup isn't working:

1. In DigitalOcean, disconnect GitHub
2. Reconnect with your MAIN account (aimiaziah)
3. This account OWNS the repo, so it will definitely show
4. Deploy directly - no collaborator needed!

---

## Verification Checklist

Before deploying, verify:

- [ ] Can you access the repo URL directly?
      https://github.com/aimiaziah/pwa-inspection
- [ ] Is the repo showing in GitHub settings?
      https://github.com/settings/repositories
- [ ] Did you authorize DigitalOcean for this specific repo?
      https://github.com/settings/installations
- [ ] Are you signed into DigitalOcean with the correct GitHub account?

---

## Still Having Issues?

Try this diagnostic:

```bash
# Check if you're signed into the right GitHub account
# Go to: https://github.com
# Top right - verify username

# Check collaborator status
# Go to: https://github.com/aimiaziah/pwa-inspection/settings/access
# Your account should be listed as collaborator

# Check DigitalOcean connection
# Go to: https://github.com/settings/installations
# Find DigitalOcean → Configure
# Verify pwa-inspection is in the selected repositories list
```

---

## Environment Variables Setup (After Repo Detected)

Once the repo is detected and selected:

1. **In App Platform setup, add these environment variables:**

   ```
   NEXT_PUBLIC_SUPABASE_URL = your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY = your_anon_key
   SUPABASE_SERVICE_ROLE_KEY = your_service_key (mark as SECRET)
   NODE_ENV = production
   ```

2. **Build settings (auto-detected by DigitalOcean):**
   - Build Command: `npm run build`
   - Run Command: `npm start`
   - Port: 8080

3. **Click "Create Resources"**

4. **Wait for deployment (~5-10 minutes)**

---

## Post-Deployment

Your app will be available at:
`https://inspection-app-xxxxx.ondigitalocean.app`

Test:
- Login functionality
- Create inspection
- Export to Excel
- All features working

---

Last Updated: 2025-12-08
