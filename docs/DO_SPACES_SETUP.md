# DigitalOcean Spaces Setup Guide

This guide will help you configure DigitalOcean Spaces for image storage, reducing Supabase egress costs.

## Why Switch to DigitalOcean Spaces?

**Supabase Free Tier:**
- 2GB egress/month
- Overages can be expensive
- Every image view downloads from Supabase

**DigitalOcean Spaces ($5/month):**
- 250GB storage
- 1TB outbound transfer
- Same region (sgp1) = faster
- Better pricing for high-traffic scenarios

## Current Implementation Status

✅ **Code updated** - All image uploads now use DO Spaces
✅ **Environment variables set** - Local .env configured
✅ **Fallback support** - Still supports Cloudflare R2 as fallback
✅ **Excel templates** - Already served locally from `/public/templates` (free!)

## Setup Steps

### 1. Create DO Spaces Bucket (If Not Already Created)

You already have:
- Bucket: `inspection-images`
- Region: `sgp1` (Singapore)
- Access Key: `DO801FHTBEAK2PA3EEG8`
- Secret Key: Already set

**Verify in DigitalOcean Dashboard:**
1. Go to https://cloud.digitalocean.com/spaces
2. Confirm `inspection-images` bucket exists in `sgp1` region
3. Go to **Settings** → Ensure **File Listing** is DISABLED (security)
4. Go to **CORS** → Add configuration if needed:

```json
[
  {
    "origin": ["https://your-app.ondigitalocean.app"],
    "method": ["GET", "HEAD"],
    "allowedHeader": ["*"],
    "maxAgeSeconds": 3000
  }
]
```

### 2. Update Environment Variables in DigitalOcean App Platform

Go to your app in DigitalOcean App Platform:
https://cloud.digitalocean.com/apps

**Navigate to:** Your App → Settings → Environment Variables

**Add these new variables:**

```bash
# Public variables (RUN_AND_BUILD_TIME)
NEXT_PUBLIC_DO_SPACES_ENDPOINT=https://sgp1.digitaloceanspaces.com
NEXT_PUBLIC_DO_SPACES_BUCKET=inspection-images
NEXT_PUBLIC_DO_SPACES_REGION=sgp1

# Note: DO_SPACES_KEY and DO_SPACES_SECRET should already be set
# If not, add them as SECRET (RUN_TIME only):
DO_SPACES_KEY=DO801FHTBEAK2PA3EEG8
DO_SPACES_SECRET=tLsaP71c8MGXZ+mgxVRM5HotQ0D/NRfwrI/WukuW9AM
DO_SPACES_ENDPOINT=https://sgp1.digitaloceanspaces.com
```

**Variable Configuration:**
- `NEXT_PUBLIC_*` → Scope: **RUN_AND_BUILD_TIME** (not encrypted)
- `DO_SPACES_KEY` → Type: **SECRET**, Scope: **RUN_TIME**
- `DO_SPACES_SECRET` → Type: **SECRET**, Scope: **RUN_TIME**
- `DO_SPACES_ENDPOINT` → Scope: **RUN_TIME**

### 3. Redeploy Your App

After adding environment variables:
1. Click **Save** in DigitalOcean dashboard
2. App will automatically redeploy
3. Wait for deployment to complete (~5-10 minutes)

### 4. Test the Implementation

After deployment:

1. **Open your app** and navigate to an inspection form
2. **Take a photo** or upload an image
3. **Check browser console** - You should see:
   ```
   [API] Uploading to DigitalOcean Spaces...
   [DO Spaces] ✅ Uploaded: inspections/1234567890-abc123.jpg
   ```
4. **Verify the image URL** - Should be:
   ```
   https://inspection-images.sgp1.digitaloceanspaces.com/inspections/...
   ```

### 5. Monitor Storage Usage

**DigitalOcean Spaces Dashboard:**
- Go to https://cloud.digitalocean.com/spaces
- Click on `inspection-images`
- Monitor storage and bandwidth usage

**Expected savings:**
- Images no longer stored as base64 in database
- Reduced Supabase egress by ~90%
- Direct CDN delivery from DO Spaces

## Bucket Permissions

Your bucket should have these settings:

**File Listing:** DISABLED (for security)
**Public Access:** ENABLED for individual files (via `public-read` ACL)

Each uploaded file is set to `public-read` automatically by the code.

## What About Existing Images?

**Current state:**
- Old inspections: Images stored as base64 in Supabase database
- New inspections: Images uploaded to DO Spaces

**Migration (Optional):**
If you want to migrate existing images to DO Spaces, we can create a migration script. This would:
1. Read all inspections from database
2. Extract base64 images
3. Upload to DO Spaces
4. Update database with new URLs
5. Reduce database size significantly

Let me know if you want me to create this migration script!

## Cost Comparison

### Current (Supabase with base64 in DB)
- **Storage:** ~500KB per image × 5 images × 100 inspections = 250MB in database
- **Egress:** Every view downloads 250MB worth of data
- **Problem:** Exceeds 2GB free egress quickly

### With DO Spaces
- **Storage:** 250MB in Spaces
- **Egress:** Minimal (only new uploads)
- **Cost:** $5/month for 1TB transfer
- **Savings:** Potentially $10-50/month depending on usage

## Troubleshooting

### Images still stored as base64
1. Check browser console for upload errors
2. Verify environment variables are set in DO App Platform
3. Check DO Spaces bucket exists and credentials are correct

### Upload fails
1. Check DO Spaces credentials
2. Verify bucket name is correct
3. Check CORS settings if uploading from browser
4. Look at server logs in DigitalOcean App Platform

### Images not loading
1. Check bucket has public access enabled
2. Verify CORS settings include your domain
3. Check image URLs in database

## Next Steps

1. ✅ Update environment variables in DO App Platform (see step 2)
2. ✅ Redeploy the app
3. ✅ Test image uploads
4. ✅ Monitor DO Spaces usage
5. ⏳ (Optional) Migrate existing base64 images to DO Spaces

## Support

If you encounter any issues, check:
1. DigitalOcean App Platform logs
2. Browser console
3. Network tab in browser DevTools
4. DO Spaces bucket settings
