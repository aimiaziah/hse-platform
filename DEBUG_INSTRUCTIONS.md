# Fire Extinguisher Submission Debug Instructions

## Issue Summary
Fire extinguisher inspections are failing to submit and not showing up in History.

## Root Causes Identified

### 1. **History Filter**
- The History page (`src/pages/saved.tsx:199-201`) only shows inspections with status: `pending_review`, `completed`, `approved`, `rejected`
- It filters out `draft` status inspections
- If your submission is saving as `draft` instead of `pending_review`, it won't appear

### 2. **Automatic SharePoint Export**
- When you submit with `status: 'pending_review'`, the API automatically tries to export to SharePoint
- If SharePoint export fails, it might be preventing the submission from completing
- The API code at `src/pages/api/inspections/index.ts:252-313` handles this

### 3. **Possible SharePoint OAuth Issues**
- SharePoint requires valid OAuth credentials
- Token might be expired or invalid
- Permissions might not be set correctly in Azure AD

## Debugging Steps

### Step 1: Check Browser Console
1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Try submitting a fire extinguisher inspection
4. Look for any red error messages
5. Take a screenshot of any errors you see

### Step 2: Check Database Directly
1. Go to your Supabase project: https://ooriqpeqtfmgfynlbsxb.supabase.co
2. Click "SQL Editor" in the left sidebar
3. Run the queries from `check-inspection-issues.sql`
4. Check:
   - Are inspections being created at all?
   - What status do they have?
   - Are there SharePoint sync errors?

### Step 3: Check Network Tab
1. Open Developer Tools (F12)
2. Go to the Network tab
3. Click "Preserve log"
4. Submit a fire extinguisher inspection
5. Look for the `/api/inspections` POST request
6. Click on it and check:
   - Request payload (what data is being sent)
   - Response (did it return 200 OK or an error?)
   - Response body (what message did it return?)

### Step 4: Check Server Logs
If you're running locally:
```bash
# Check the terminal where you ran `npm run dev`
# Look for any error messages when you submit
```

## Quick Fixes to Try

### Fix 1: Disable Automatic SharePoint Export (Temporary)
This will let you submit inspections without SharePoint blocking it:

**File: `src/pages/api/inspections/index.ts`**

Find lines 252-313 and comment them out or wrap in a check:

```typescript
// [NEW] Automatically export to SharePoint if status is pending_review
if (inspectionStatus === 'pending_review' && process.env.ENABLE_AUTO_SHAREPOINT === 'true') {
  // ... existing SharePoint code ...
}
```

Then in `.env`, add:
```
ENABLE_AUTO_SHAREPOINT=false
```

This will temporarily disable SharePoint export so you can submit inspections.

### Fix 2: Make SharePoint Export More Resilient

The current code already handles SharePoint errors gracefully (lines 297-312), but we can make it better.

### Fix 3: Check SharePoint Credentials

Verify in `.env`:
```bash
# These should all be set:
NEXT_PUBLIC_SHAREPOINT_OAUTH_CLIENT_ID=your-client-id-here
NEXT_PUBLIC_SHAREPOINT_TENANT_ID=your-tenant-id-here
NEXT_PUBLIC_SHAREPOINT_SITE_URL=https://yourdomain.sharepoint.com/sites/YourSite
SHAREPOINT_CLIENT_SECRET=your-client-secret-here
SHAREPOINT_LIBRARY_NAME=Shared Documents
SHAREPOINT_BASE_FOLDER=HSE/New Document
```

## What to Report Back

Please provide:
1. **Browser console errors** (screenshot)
2. **Network tab response** for `/api/inspections` (screenshot)
3. **Database query results** from Supabase SQL Editor
4. **Any error messages** from the terminal

Once you provide this information, I can give you a precise fix!

## Expected Behavior

When working correctly:
1. You submit fire extinguisher inspection
2. API creates inspection with status `'pending_review'`
3. API tries to export to SharePoint
4. If SharePoint succeeds: `sharepoint_sync_status = 'synced'`
5. If SharePoint fails: `sharepoint_sync_status = 'failed'` (but inspection still created!)
6. Inspection appears in History with status "Pending Review"
7. Supervisor can review it

## Common Issues

### Issue: "Failed to submit inspection"
- **Cause**: Database error or missing required fields
- **Check**: Network tab for actual error message

### Issue: Inspection created but not in History
- **Cause**: Status is `'draft'` instead of `'pending_review'`
- **Check**: Database query #1 in `check-inspection-issues.sql`

### Issue: SharePoint export fails
- **Cause**: OAuth token expired, invalid credentials, or permission issues
- **Check**: Database query #2 for SharePoint sync errors
- **Impact**: Inspection should still be created, just not exported to SharePoint
