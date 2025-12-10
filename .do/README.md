# DigitalOcean Deployment Configuration

This directory contains all files needed for deploying to DigitalOcean App Platform.

## Files

| File | Purpose |
|------|---------|
| `app.yaml` | **App Platform specification** - defines build, run, and environment configuration |
| `DEPLOYMENT_CHECKLIST.md` | **Quick reference** - step-by-step checklist for deployment |
| `IMPROVEMENTS.md` | **What was fixed** - explains improvements from previous deployment attempt |
| `README.md` | This file - directory overview |

## Quick Start

### First Time Deployment

1. **Read the improvements**
   ```bash
   cat .do/IMPROVEMENTS.md
   ```

2. **Follow the checklist**
   ```bash
   cat .do/DEPLOYMENT_CHECKLIST.md
   ```

3. **Read the full guide** (in project root)
   ```bash
   cat DIGITALOCEAN_DEPLOYMENT.md
   ```

### Deploy Now

**Option 1: Via App Spec (Fastest)**
1. Push changes to GitHub
2. Go to https://cloud.digitalocean.com/apps
3. Click "Create App" → "Use App Spec"
4. Upload `.do/app.yaml`
5. Configure environment variables
6. Deploy

**Option 2: Via UI**
- Follow the guide in `../DIGITALOCEAN_DEPLOYMENT.md`

## Documentation Structure

```
pwa-inspection/
├── .do/
│   ├── app.yaml                    # 👈 App Platform config (upload this)
│   ├── DEPLOYMENT_CHECKLIST.md    # 👈 Quick checklist
│   ├── IMPROVEMENTS.md             # 👈 What was fixed
│   └── README.md                   # 👈 You are here
├── DIGITALOCEAN_DEPLOYMENT.md      # 👈 Full deployment guide
└── ...
```

## Key Configuration

### Build Settings (from app.yaml)

- **Build Command**: `npm ci && npm run build`
- **Run Command**: `npm start`
- **Port**: `8080`
- **Node Version**: `18`
- **Health Check**: `/api/health`

### Required Environment Variables

Must be set in App Platform UI:
- `NODE_ENV` = `production`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET` (64+ characters)

See full list in `DEPLOYMENT_CHECKLIST.md`

## Before You Deploy

- [x] TypeScript is in `dependencies` (already fixed)
- [x] Health check endpoint exists at `/api/health`
- [x] App Platform config created (app.yaml)
- [ ] Environment variables ready
- [ ] Supabase project is running
- [ ] GitHub repo is up to date

## Cost Estimate

- **App Platform**: $5/month (Basic tier)
- **Spaces**: Free with GitHub Student Pack ($200 credit)
- **Supabase**: Free tier
- **Total**: $5/month (or 40 months free with student pack)

## Support

- **Full guide**: `../DIGITALOCEAN_DEPLOYMENT.md`
- **Checklist**: `DEPLOYMENT_CHECKLIST.md`
- **Improvements**: `IMPROVEMENTS.md`
- **DigitalOcean Docs**: https://docs.digitalocean.com/products/app-platform/

---

**Ready to deploy?** Start with `DEPLOYMENT_CHECKLIST.md` 🚀
