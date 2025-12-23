# 🚀 Deploy Theta HSE to DigitalOcean - Quick Start

## ✅ Git Status
**PWA changes pushed to GitHub:** `dbb48f6`
- Manifest configured with "Theta HSE"
- Icons generated from theta-logo.png
- Meta tags updated for iOS/Android
- Documentation added

---

## 🚀 Deploy to DigitalOcean App Platform

### Option 1: New Deployment (First Time)

#### Step 1: Go to DigitalOcean
1. Visit: https://cloud.digitalocean.com/apps
2. Click **"Create App"**

#### Step 2: Connect Repository
1. Choose **GitHub** as source
2. Select repository: **aimiaziah/hse-platform**
3. Select branch: **main**
4. Click **Next**

#### Step 3: Configure Resources
1. **Type:** Web Service
2. **Source Directory:** `/` (root)
3. **Build Command:** 
   ```bash
   npm install && npm run build
   ```
4. **Run Command:**
   ```bash
   npm start
   ```
5. **HTTP Port:** 8080
6. Click **Next**

#### Step 4: Environment Variables
Add these environment variables:

```
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Important:** Replace with your actual Supabase credentials!

Click **Next**

#### Step 5: Choose Plan
1. Select your preferred plan (Basic recommended for start)
2. Choose datacenter region (closest to your users)
3. Click **Next**

#### Step 6: Review & Deploy
1. **App Name:** theta-hse (or your preferred name)
2. Review all settings
3. Click **Create Resources**

⏳ **Deployment will take 5-10 minutes**

---

### Option 2: Existing Deployment (Update)

If you already have an app deployed:

#### Automatic Deployment:
✅ **Your app will auto-deploy!**
- DigitalOcean detected the push to `main`
- Building and deploying automatically
- Check: https://cloud.digitalocean.com/apps

#### Manual Trigger (if needed):
1. Go to: https://cloud.digitalocean.com/apps
2. Select your app
3. Click **"Actions"** → **"Force Rebuild and Deploy"**

---

## 🔐 Configure HTTPS (Required for PWA)

### DigitalOcean App Platform (Automatic):
✅ **SSL is automatic!** DigitalOcean provides free SSL certificate.

### Custom Domain (Optional):
1. Go to your app → **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter your domain (e.g., `hse.theta-edge.com`)
4. Update DNS:
   ```
   Type: CNAME
   Name: hse (or @)
   Value: [provided by DigitalOcean]
   ```
5. Wait 5-30 minutes for DNS propagation
6. SSL certificate auto-provisions

---

## 📱 Test PWA Installation

### After Deployment:

#### 1. Verify Deployment
- Visit your app URL
- Should show "Theta HSE" in browser title
- Check for any errors

#### 2. Test PWA on Mobile

**iOS (iPhone/iPad):**
1. Open **Safari** (not Chrome!)
2. Navigate to your app URL
3. Tap **Share** button (box with arrow up)
4. Scroll down, tap **"Add to Home Screen"**
5. ✅ Should show: "Theta HSE" with Theta logo
6. Tap **Add** (top right)
7. Check home screen - Theta logo should appear
8. Tap icon - app opens fullscreen (no Safari UI)

**Android (Chrome):**
1. Open **Chrome**
2. Navigate to your app URL
3. Look for **"Install Theta HSE"** banner
4. Or tap **⋮ menu** → **"Install app"**
5. ✅ Should show: "Theta HSE" with Theta logo
6. Tap **Install**
7. Check home screen - Theta logo should appear
8. Tap icon - app opens in standalone mode

#### 3. Test Desktop Installation

**Chrome/Edge:**
1. Visit your app URL
2. Look for **install icon** in address bar (⊕ or computer icon)
3. Click the icon
4. Click **Install**
5. App opens in standalone window (no browser tabs/address bar)

---

## 🔍 Verify PWA Configuration

### Chrome DevTools Test:

1. **Open DevTools** (F12)

2. **Check Manifest:**
   - Go to: **Application** tab → **Manifest**
   - ✅ Name: "Theta HSE"
   - ✅ Short name: "Theta HSE"
   - ✅ Start URL: "/"
   - ✅ Display: "standalone"
   - ✅ All icons load (9 sizes)

3. **Check Service Worker:**
   - Go to: **Application** tab → **Service Workers**
   - ✅ Status: "activated and running"
   - ✅ Source: sw.js

4. **Run Lighthouse Audit:**
   - Click **Lighthouse** tab (or right-click → Inspect → Lighthouse)
   - Check: **Progressive Web App**
   - Click **Generate report**
   - ✅ PWA score should be 90+

---

## 📊 Deployment Checklist

### Pre-Deployment ✅
- [x] Git commit successful
- [x] Git push successful
- [x] PWA configured
- [x] Icons generated
- [x] Documentation created

### During Deployment
- [ ] DigitalOcean build starts
- [ ] Build completes successfully
- [ ] App is deployed and accessible
- [ ] HTTPS is enabled (automatic)

### Post-Deployment Testing
- [ ] App loads at deployment URL
- [ ] HTTPS working (🔒 in address bar)
- [ ] Lighthouse PWA audit passes (90+)
- [ ] Can install on iOS Safari
- [ ] Can install on Android Chrome
- [ ] Can install on Desktop
- [ ] App name shows as "Theta HSE"
- [ ] Theta logo displays correctly
- [ ] Offline mode works
- [ ] No console errors

---

## 🆘 Troubleshooting

### Issue: Build Fails

**Check build logs:**
1. Go to App → **Deployments** tab
2. Click failed deployment
3. View **Build Logs**

**Common fixes:**
```bash
# Missing dependencies
npm install

# Clear cache and rebuild
# In DigitalOcean: Actions → Force Rebuild
```

### Issue: "Add to Home Screen" Not Showing

**Causes:**
- HTTPS not enabled (check for 🔒 in address bar)
- Manifest not loading (check DevTools → Network)
- Service worker not registered

**Fix:**
1. Verify HTTPS is working
2. Check: `https://your-app-url.com/manifest.json`
3. Clear browser cache and try again

### Issue: Icons Not Displaying

**Fix:**
```bash
# Regenerate icons locally
npm run generate:icons

# Commit and push
git add public/icon-*.png
git commit -m "Update PWA icons"
git push origin main
```

### Issue: App Not Auto-Deploying

**Check:**
1. Go to App → **Settings** → **App-Level**
2. Verify **"Auto Deploy"** is enabled
3. Check **Deployments** tab for build status

**Manual deploy:**
- **Actions** → **Force Rebuild and Deploy**

---

## 🔄 Monitor Deployment

### Check Status:
```
Dashboard: https://cloud.digitalocean.com/apps
Status: Building → Deploying → Live
```

### View Logs:
1. Go to your app
2. Click **Runtime Logs** (to see app output)
3. Click **Build Logs** (to see build process)

### Get App URL:
- Found at top of app page
- Format: `https://your-app-name-xxxxx.ondigitalocean.app`

---

## ✨ Success Indicators

When deployment is successful:

1. **App URL accessible** ✅
2. **HTTPS enabled** (🔒) ✅
3. **Title shows "Theta HSE"** ✅
4. **Lighthouse PWA score 90+** ✅
5. **Can install on mobile** ✅
6. **App works offline** ✅

---

## 📞 Next Steps After Deployment

### 1. Share with Team
```
Your Theta HSE app is live at:
https://your-app-url.ondigitalocean.app

Installation instructions:
- iOS: Safari → Share → Add to Home Screen
- Android: Chrome → Install app
```

### 2. Custom Domain (Optional)
- Add your company domain
- Configure DNS
- SSL auto-provisions

### 3. Monitor Usage
- Check DigitalOcean metrics
- Monitor error logs
- Track PWA installations

---

## 📚 Documentation Reference

- **Full Guide:** `PWA_DEPLOYMENT_GUIDE.md`
- **Quick Reference:** `PWA_QUICK_REFERENCE.md`
- **Setup Summary:** `PWA_SETUP_SUMMARY.md`

---

## 🎉 You're Ready to Deploy!

**Your changes are pushed to GitHub.**

**Next step:** Go to https://cloud.digitalocean.com/apps

**Expected result:** Users can install "Theta HSE" with Theta logo on their home screens!

---

**Deployment Time:** ~5-10 minutes  
**Status:** ✅ Ready  
**Git Commit:** dbb48f6  
**Branch:** main

