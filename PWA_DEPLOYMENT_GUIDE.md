# PWA Deployment Guide for Theta HSE

## Overview
This guide will help you deploy the Theta HSE application to DigitalOcean with full PWA (Progressive Web App) capabilities, allowing users to install it on their home screens.

## PWA Configuration Summary

### ✅ Completed Setup

1. **Manifest File** (`public/manifest.json`)
   - App Name: "Theta HSE"
   - Short Name: "Theta HSE"
   - All icon sizes generated from theta-logo.png (72x72 to 512x512)
   - Display: standalone (full-screen app experience)
   - Theme color: white (#ffffff)

2. **Icons Generated**
   - All PWA icon sizes created from `public/theta-logo.png`
   - Sizes: 72, 96, 128, 144, 152, 180, 192, 384, 512 pixels
   - Optimized for all devices (iOS, Android, Desktop)

3. **Service Worker**
   - Configured via `next-pwa` in `next.config.js`
   - Offline support enabled
   - Network-first caching strategy

4. **Meta Tags**
   - Apple touch icon configured
   - Mobile web app capable
   - Apple mobile web app title: "Theta HSE"
   - Theme color configured

## Pre-Deployment Checklist

### 1. Test PWA Locally

```bash
# Build for production
npm run build

# Start production server
npm start
```

Then test the PWA features:
- Open Chrome DevTools → Application → Manifest (verify all icons load)
- Check Service Worker tab (should be registered)
- Use Lighthouse to audit PWA readiness

### 2. Environment Variables

Ensure these are set on DigitalOcean:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NODE_ENV=production
```

## DigitalOcean Deployment Options

### Option 1: DigitalOcean App Platform (Recommended)

#### Step 1: Prepare Your Repository
```bash
# Ensure all changes are committed
git add .
git commit -m "Configure PWA for Theta HSE"
git push origin main
```

#### Step 2: Create App on DigitalOcean

1. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Click "Create App"
3. Connect your GitHub/GitLab repository
4. Select the `pwa-inspection` repository

#### Step 3: Configure Build Settings

**Build Command:**
```bash
npm install && npm run build
```

**Run Command:**
```bash
npm start
```

**Environment Variables:** (Add in App Platform dashboard)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NODE_ENV=production`

#### Step 4: Configure Domain & HTTPS

1. Add your custom domain (e.g., `hse.theta-edge.com`)
2. DigitalOcean will automatically provision SSL/TLS certificate
3. **IMPORTANT**: PWA requires HTTPS to work!

#### Step 5: Deploy

1. Click "Deploy"
2. Wait for build to complete (5-10 minutes)
3. App will be available at your domain

### Option 2: DigitalOcean Droplet (Manual)

#### Step 1: Create Droplet

1. Create Ubuntu 22.04 LTS droplet
2. Choose appropriate size (minimum: 2GB RAM)
3. Add SSH key for access

#### Step 2: Install Node.js & PM2

```bash
# SSH into droplet
ssh root@your_droplet_ip

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
npm install -g pm2

# Install Nginx
sudo apt install nginx
```

#### Step 3: Clone & Build Application

```bash
# Clone repository
git clone https://github.com/your-username/pwa-inspection.git
cd pwa-inspection

# Install dependencies
npm install

# Build for production
npm run build
```

#### Step 4: Configure PM2

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'theta-hse',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      NEXT_PUBLIC_SUPABASE_URL: 'your_supabase_url',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'your_supabase_anon_key'
    }
  }]
}
```

Start with PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Step 5: Configure Nginx

Create `/etc/nginx/sites-available/theta-hse`:

```nginx
server {
    listen 80;
    server_name your_domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/theta-hse /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 6: Install SSL Certificate (Required for PWA)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your_domain.com
```

## Post-Deployment Testing

### 1. Test PWA Installation on Mobile

#### iOS (iPhone/iPad):
1. Open Safari and navigate to your app URL
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Verify the app name shows as "Theta HSE"
5. Verify the Theta logo appears
6. Tap "Add" in the top right
7. App icon should appear on home screen

#### Android (Chrome):
1. Open Chrome and navigate to your app URL
2. Chrome will show "Add Theta HSE to Home screen" banner
3. Tap "Install" or "Add"
4. Alternatively, tap menu (3 dots) → "Install app"
5. Verify app name and icon
6. App icon should appear on home screen

### 2. Verify PWA Features

#### Desktop (Chrome/Edge):
1. Visit your app URL
2. Look for install icon in address bar (⊕ or computer icon)
3. Click to install as desktop app
4. Verify standalone window opens (no browser UI)

#### Test Offline Functionality:
1. Install the PWA
2. Open the app
3. Turn off WiFi/mobile data (or use DevTools offline mode)
4. Refresh the app - it should still work
5. Previously loaded pages should be cached

### 3. Lighthouse PWA Audit

```bash
# Chrome DevTools → Lighthouse
# Run audit with "Progressive Web App" checked
# Should score 90+ for PWA
```

### 4. Verify Manifest & Service Worker

**Check Manifest:**
1. Open DevTools → Application → Manifest
2. Verify:
   - Name: "Theta HSE"
   - Start URL: "/"
   - All icons load correctly
   - Theme color: #ffffff

**Check Service Worker:**
1. DevTools → Application → Service Workers
2. Should show status: "activated and running"
3. Check scope: "/" (entire site)

## Common Issues & Solutions

### Issue 1: "Add to Home Screen" Not Appearing

**Causes:**
- Not using HTTPS (PWA requires SSL)
- Service worker not registered
- Manifest file not loaded

**Solutions:**
```bash
# Verify HTTPS is working
curl -I https://your_domain.com

# Check manifest in browser
https://your_domain.com/manifest.json

# Verify service worker
# DevTools → Application → Service Workers
```

### Issue 2: Icons Not Showing Correctly

**Solution:**
```bash
# Regenerate icons
npm install --include=optional sharp
node generate-icons.js

# Rebuild and redeploy
npm run build
```

### Issue 3: Service Worker Not Updating

**Solution:**
```javascript
// In DevTools → Application → Service Workers
// Click "Update" or "Unregister"
// Then refresh the page
```

### Issue 4: Offline Mode Not Working

**Check:**
1. Service worker is active
2. Network-first caching strategy is configured
3. Check Console for service worker errors

## PWA Best Practices for Production

### 1. HTTPS is Mandatory
- Use Let's Encrypt for free SSL certificates
- PWA features will not work over HTTP

### 2. Icon Guidelines
- Use high-quality icons (512x512 source)
- Ensure logo works on light and dark backgrounds
- Test on actual devices before deployment

### 3. Performance Optimization
```bash
# Already configured in next.config.js:
- Standalone output for smaller deployments
- Image optimization enabled
- Source maps disabled in production
```

### 4. Update Strategy
```javascript
// Service worker will auto-update on deployment
// Users will get new version on next visit
// No manual cache clearing required
```

### 5. Analytics & Monitoring
```javascript
// Track PWA installs
window.addEventListener('appinstalled', (evt) => {
  console.log('App was installed');
  // Send to analytics
});

// Track standalone mode usage
if (window.matchMedia('(display-mode: standalone)').matches) {
  console.log('Running as PWA');
  // Track PWA usage
}
```

## Rollback Plan

If issues occur after deployment:

```bash
# Option 1: Rollback via DigitalOcean App Platform
# Go to App → Deployments → Select previous deployment → Rollback

# Option 2: Rollback via Git
git revert HEAD
git push origin main
# App Platform will auto-deploy previous version

# Option 3: Manual Droplet Rollback
pm2 stop theta-hse
git reset --hard previous_commit
npm install && npm run build
pm2 restart theta-hse
```

## Monitoring & Maintenance

### Monitor Service Worker
```javascript
// Check service worker updates
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Active service workers:', registrations.length);
});
```

### Update Cycle
1. Push changes to repository
2. App Platform auto-deploys
3. Service worker updates automatically
4. Users get new version on next visit

## Support & Troubleshooting

### Logs Access

**DigitalOcean App Platform:**
```bash
# View logs in App Platform dashboard
# Runtime Logs show Node.js output
# Build Logs show npm install/build output
```

**Droplet with PM2:**
```bash
# View logs
pm2 logs theta-hse

# Monitor real-time
pm2 monit
```

### Clear Browser Cache (For Testing)

**Chrome:**
1. DevTools → Application → Clear storage
2. Check "Unregister service workers"
3. Click "Clear site data"

**Safari (iOS):**
1. Settings → Safari → Clear History and Website Data

## Additional Resources

- [Next.js PWA Documentation](https://github.com/shadowwalker/next-pwa)
- [DigitalOcean App Platform Docs](https://docs.digitalocean.com/products/app-platform/)
- [PWA Best Practices](https://web.dev/pwa-checklist/)
- [Service Worker Lifecycle](https://web.dev/service-worker-lifecycle/)

---

## Quick Start Commands

```bash
# Local testing
npm run build && npm start

# Generate icons (if needed)
node generate-icons.js

# Test PWA readiness
# Chrome DevTools → Lighthouse → PWA audit

# Deploy to production
git push origin main  # If using App Platform
```

---

**Your Theta HSE app is now ready for PWA deployment! 🚀**

When users install it on their home screens, they'll see the Theta logo and "Theta HSE" name, giving them a native app-like experience on all devices.

