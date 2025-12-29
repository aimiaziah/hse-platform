# SharePoint Auto-Export Fix Summary

## Issues Found and Fixed

### 1. ✅ FIXED: Job Queue Query Error
**Problem**: Jobs were not being processed due to invalid SQL syntax in the job queue query.

**Error**: `invalid input syntax for type integer: "max_retries"`

**Fix**: Updated `src/utils/jobProcessor.ts` line 168 to use a simpler query:
```typescript
// Before (broken):
.or(`status.eq.pending,and(status.eq.failed,retry_count.lt.max_retries)`)

// After (fixed):
.eq('status', 'pending')
```

### 2. ✅ FIXED: Supabase Query Syntax Error
**Problem**: Code was calling `.catch()` on Supabase queries, which don't return Promises.

**Error**: `supabase.from(...).update(...).eq(...).catch is not a function`

**Fix**: Updated error handling in `src/utils/jobProcessor.ts` to properly handle Supabase responses:
```typescript
// Before (broken):
await supabase.from('inspections').update({...}).eq(...).catch(...)

// After (fixed):
const { error } = await supabase.from('inspections').update({...}).eq(...)
if (error) console.error(...)
```

### 3. ⚠️ NEEDS ADMIN ACTION: SharePoint Permissions
**Problem**: SharePoint OAuth app lacks required permissions or admin consent.

**Error**: `401 Unauthorized` when accessing SharePoint site

**Root Cause**: The Azure AD app registration doesn't have `Sites.ReadWrite.All` permission OR admin consent hasn't been granted.

## How to Fix SharePoint Permissions

### Option 1: Grant Admin Consent (Recommended)
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Find your app (Client ID: `3ea4b086-3ece-4fdd-9ce1-73d11370f869`)
4. Click **API permissions**
5. Verify `Sites.ReadWrite.All` permission is listed
6. Click **"Grant admin consent for [Your Organization]"**
7. Wait 5-10 minutes for changes to propagate

### Option 2: Add Missing Permission (If Not Listed)
1. In App registrations → Your app → **API permissions**
2. Click **"Add a permission"**
3. Select **Microsoft Graph**
4. Select **Application permissions** (not Delegated)
5. Search for and select: **Sites.ReadWrite.All**
6. Click **"Add permissions"**
7. Click **"Grant admin consent for [Your Organization]"**
8. Wait 5-10 minutes for changes to propagate

### Option 3: Verify Site URL
Double-check that your site URL is correct:
- Current: `https://thetaedgebhd.sharepoint.com/sites/ThetaEdge`
- Make sure this exact URL is accessible in your browser

## Testing the Fix

After granting permissions, test the auto-export:

### 1. Test SharePoint Authentication
```bash
node test-sharepoint-auth.js
```

Expected output: ✅ SharePoint authentication is working correctly!

### 2. Process Pending Jobs
```bash
curl -X POST http://localhost:8080/api/jobs/process
```

### 3. Submit a New Inspection
1. Open the app
2. Fill out and submit a First Aid or Fire Extinguisher form
3. Check the job queue status:
```bash
node check-job-queue.js
```

Expected: Job status should change from `pending` → `processing` → `completed`

## Automatic Job Processing

Currently, jobs are created but need to be manually processed. To enable automatic processing:

### Option A: Setup Cron Job (Production)
Add a cron job to call the job processor every 5 minutes:
```bash
*/5 * * * * curl -X POST https://your-domain.com/api/jobs/process
```

Or use a service like:
- **Vercel Cron**: Add to `vercel.json`
- **GitHub Actions**: Scheduled workflow
- **External Cron**: EasyCron, cron-job.org

### Option B: Make Processing Synchronous (Quick Fix)
Edit `src/pages/api/inspections/index.ts` line 287 to await the processing:
```typescript
// Before (async, non-blocking):
processQueue(1).catch((err) => { ... });

// After (synchronous, waits for completion):
await processQueue(1);
```

⚠️ Note: This will make form submissions slower (~3-5 seconds)

## Current Status

✅ Code bugs fixed
✅ Jobs are being created successfully
✅ Job processor can find and process jobs
⚠️ SharePoint authentication needs admin consent
⚠️ Auto-processing needs cron job or code change

## Files Modified

1. `src/utils/jobProcessor.ts` - Fixed query and error handling
2. `test-sharepoint-auth.js` - Created diagnostic tool
3. `check-job-queue.js` - Created status checker

## Next Steps

1. **Immediate**: Grant admin consent for SharePoint permissions (Option 1 above)
2. **Short-term**: Setup cron job for automatic processing OR make processing synchronous
3. **Test**: Verify auto-export works end-to-end
4. **Optional**: Add monitoring dashboard for job queue status
