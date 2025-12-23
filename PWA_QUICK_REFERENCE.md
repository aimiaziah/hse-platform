# Theta HSE - PWA Quick Reference

## 🚀 Quick Deployment Checklist

### Before Deployment
- [ ] Run `npm test:pwa` - verify all PWA config is correct
- [ ] Run `npm run build` - ensure production build succeeds
- [ ] Test locally with `npm start`
- [ ] Verify icons load at `http://localhost:8080/manifest.json`
- [ ] Check Service Worker in DevTools (Application tab)

### DigitalOcean Deployment
- [ ] Repository pushed to GitHub/GitLab
- [ ] Environment variables configured
- [ ] HTTPS/SSL configured (REQUIRED for PWA)
- [ ] Domain DNS pointing to app
- [ ] First deployment successful

### Post-Deployment Testing
- [ ] Visit app URL in Chrome
- [ ] Run Lighthouse PWA audit (should score 90+)
- [ ] Test "Add to Home Screen" on iOS Safari
- [ ] Test "Install App" on Android Chrome
- [ ] Test offline functionality
- [ ] Verify app name shows as "Theta HSE"
- [ ] Verify Theta logo appears correctly

---

## 📱 Quick Commands

```bash
# Test PWA configuration
npm run test:pwa

# Regenerate icons from theta-logo.png
npm run generate:icons

# Build for production
npm run build

# Test production build locally
npm start

# Run development server
npm run dev
```

---

## 🔧 Configuration Files

| File | Purpose | Key Settings |
|------|---------|--------------|
| `public/manifest.json` | PWA manifest | Name: "Theta HSE" |
| `public/theta-logo.png` | Source logo | Used to generate all icons |
| `public/icon-*.png` | App icons | 9 sizes (72px to 512px) |
| `next.config.js` | Next.js + PWA | next-pwa configured |
| `src/layouts/BaseLayout.tsx` | Meta tags | Apple touch icon, manifest link |
| `src/pages/_document.tsx` | Favicon | Theta logo as favicon |

---

## 📊 PWA Requirements Checklist

### ✅ Completed
- [x] HTTPS (SSL certificate) - **Required on deployment**
- [x] Web app manifest (`manifest.json`)
- [x] Service worker registered
- [x] App name: "Theta HSE"
- [x] Icons (all required sizes)
- [x] Display mode: standalone
- [x] Start URL: /
- [x] Theme color configured
- [x] Apple touch icon
- [x] Offline support
- [x] Responsive design

---

## 🎨 Icon Specifications

All icons generated from `public/theta-logo.png`:

| Size | Purpose |
|------|---------|
| 72x72 | Small Android devices |
| 96x96 | Small Android devices |
| 128x128 | Small Android devices |
| 144x144 | Medium Android devices |
| 152x152 | iPad |
| 180x180 | iPhone |
| 192x192 | Standard Android |
| 384x384 | Large Android devices |
| 512x512 | Splash screens, maskable |

---

## 🌐 Environment Variables

Required on DigitalOcean:

```env
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=your_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
```

---

## 📲 How Users Install PWA

### iOS (iPhone/iPad)
1. Open **Safari** (not Chrome!)
2. Navigate to app URL
3. Tap **Share button** (square with arrow)
4. Scroll and tap **"Add to Home Screen"**
5. Confirm name is "Theta HSE"
6. Tap **Add**

### Android (Chrome)
1. Open **Chrome**
2. Navigate to app URL
3. Look for **"Install"** banner or popup
4. Or tap **⋮ menu** → **"Install app"**
5. Tap **Install**

### Desktop (Chrome/Edge)
1. Visit app URL
2. Look for **install icon** in address bar (⊕)
3. Click to install
4. App opens in standalone window

---

## 🔍 Testing Tools

### Chrome DevTools
1. **Application Tab:**
   - Manifest: Verify name, icons, colors
   - Service Workers: Check status "activated"
   - Storage: Check cache

2. **Lighthouse:**
   - Click Lighthouse tab
   - Check "Progressive Web App"
   - Run audit
   - Should score 90-100

3. **Network Tab:**
   - Enable "Offline" mode
   - Refresh page
   - Should still load (cached)

### Mobile Testing
- **iOS:** Use real device (Safari on iOS)
- **Android:** Use real device or Chrome DevTools device emulation
- **Desktop:** Chrome/Edge with install prompt

---

## ⚠️ Common Issues

| Issue | Solution |
|-------|----------|
| "Add to Home Screen" not showing | Ensure HTTPS is enabled |
| Icons not loading | Run `npm run generate:icons` |
| Service worker not registering | Check Console for errors |
| App name wrong | Check `manifest.json` |
| Offline mode not working | Clear cache and test again |

---

## 📈 Success Metrics

After deployment, verify:
- ✅ Lighthouse PWA score: 90+
- ✅ Can install on iOS Safari
- ✅ Can install on Android Chrome
- ✅ Offline mode works
- ✅ App name: "Theta HSE"
- ✅ Theta logo displays correctly
- ✅ Standalone mode (no browser UI)

---

## 🔄 Update Process

When you make changes:

1. Push to repository: `git push origin main`
2. DigitalOcean auto-deploys
3. Service worker auto-updates
4. Users get new version on next visit
5. No manual cache clearing needed

---

## 📚 Quick Links

- **Full Guide:** See `PWA_DEPLOYMENT_GUIDE.md`
- **Test Script:** `npm run test:pwa`
- **Generate Icons:** `npm run generate:icons`
- **DigitalOcean:** [App Platform Dashboard](https://cloud.digitalocean.com/apps)

---

## 🆘 Emergency Rollback

If something breaks after deployment:

### DigitalOcean App Platform:
1. Go to App → Deployments
2. Click previous working deployment
3. Click "Rollback"

### Manual (Droplet):
```bash
git reset --hard previous_commit
npm run build
pm2 restart theta-hse
```

---

## ✨ What Users Will See

When installed as PWA:
- **Home screen icon:** Theta logo
- **App name:** "Theta HSE"
- **No browser UI:** Fullscreen app experience
- **Fast loading:** Cached resources
- **Offline access:** Works without internet
- **Native feel:** Looks like native app

---

**Your Theta HSE app is PWA-ready! 🎉**

For detailed instructions, see `PWA_DEPLOYMENT_GUIDE.md`

