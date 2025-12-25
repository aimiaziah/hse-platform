# SharePoint Integration - Simplified Setup (FREE!)

**Quick setup in 10 minutes using your existing Microsoft login credentials!**

---

## What You Already Have ✅

- ✅ Admin permission granted
- ✅ Azure AD app for Microsoft login
- ✅ Client ID, Tenant ID, and Client Secret

**You can reuse all of these!** Just need to add one permission.

---

## Step 1: Add SharePoint Permission (2 min)

1. Go to https://portal.azure.com
2. Navigate to **Azure Active Directory** → **App registrations**
3. Find your existing app (used for Microsoft login)
4. Click **API permissions** (left menu)
5. Click **+ Add a permission**
6. Select **Microsoft Graph**
7. Select **Application permissions** (not Delegated!)
8. Search for: `Sites.ReadWrite.All`
9. Check the box and click **Add permissions**
10. **CRITICAL**: Click **Grant admin consent for [Your Organization]**
11. Wait for green checkmark ✅ to appear

**Done!** Your app can now access SharePoint.

---

## Step 2: Create SharePoint Columns - ONLY 2! (3 min)

1. Go to: https://thetaedgebhd.sharepoint.com/sites/ThetaEdge/Shared%20Documents
2. Click **⚙ Settings** → **Library settings**
3. Under "Columns", click **Create column**

### Column 1: Inspection Info
- **Column name**: `InspectionInfo`
- **Type**: Single line of text
- Click **OK**

**Example value**: `Fire Extinguisher - INS-001 by John Inspector`

### Column 2: Status
- **Column name**: `Status`
- **Type**: Multiple lines of text
- **Number of lines for editing**: 6
- Click **OK**

**Example value**:
```
Submitted by John Inspector on Dec 25, 2025, 10:30 AM
Approved by Jane Supervisor on Dec 26, 2025, 2:15 PM
Comments: All items checked and in good condition
```

**That's it!** Only 2 columns needed.

---

## Step 3: Update Environment Variables (2 min)

Open your `.env.local` file and add:

```bash
# SharePoint OAuth Integration (FREE!)
# Uses your existing Microsoft login app credentials
NEXT_PUBLIC_SHAREPOINT_SITE_URL=https://thetaedgebhd.sharepoint.com/sites/ThetaEdge
NEXT_PUBLIC_SHAREPOINT_TENANT_ID=<your-tenant-id>
NEXT_PUBLIC_SHAREPOINT_OAUTH_CLIENT_ID=<your-client-id>
SHAREPOINT_CLIENT_SECRET=<your-client-secret>
SHAREPOINT_LIBRARY_NAME=Shared Documents
SHAREPOINT_BASE_FOLDER=HSE/New Document
```

**Replace with YOUR values:**
- `<your-tenant-id>` - Same as Microsoft login
- `<your-client-id>` - Same as Microsoft login
- `<your-client-secret>` - Same as Microsoft login

**Where to find these?**
1. Azure Portal → Azure AD → App registrations → Your app
2. **Overview** page shows Client ID and Tenant ID
3. **Certificates & secrets** shows Client Secret (or create new one if needed)

---

## Step 4: Run Database Migration (1 min)

In your terminal:

```bash
npx supabase db push
```

This adds SharePoint tracking to your database.

---

## Step 5: Restart App (1 min)

```bash
# Stop the server (Ctrl+C)
# Start again
npm run dev
```

---

## Step 6: Test It! (1 min)

1. **Log in as inspector**
2. **Submit any inspection form**
3. **Check SharePoint**: https://thetaedgebhd.sharepoint.com/sites/ThetaEdge/Shared%20Documents
4. **Look for**: `HSE/New Document/Fire_Extinguisher/2025/December/`
5. **Verify**:
   - ✅ Excel file uploaded
   - ✅ **InspectionInfo**: `Fire Extinguisher - INS-001 by John Inspector`
   - ✅ **Status**: `Submitted by John Inspector on Dec 25, 2025, 10:30 AM`

6. **Test Status Update**:
   - Log in as supervisor
   - Approve/reject inspection
   - Check SharePoint - Status should update to:
     ```
     Approved by Jane Supervisor on Dec 26, 2025, 2:15 PM
     Comments: Looks good!
     ```

---

## What the Columns Will Show

### InspectionInfo Column:
```
Fire Extinguisher - INS-2025-001 by John Inspector
First Aid - INS-2025-002 by Sarah Inspector
HSE Inspection - INS-2025-003 by Mike Inspector
```

### Status Column (updates as inspection progresses):
```
Submitted by John Inspector on Dec 25, 2025, 10:30 AM
```

After supervisor reviews:
```
Submitted by John Inspector on Dec 25, 2025, 10:30 AM
Approved by Jane Supervisor on Dec 26, 2025, 2:15 PM
Comments: All items checked and in good condition
```

Or if rejected:
```
Submitted by John Inspector on Dec 25, 2025, 10:30 AM
Rejected by Jane Supervisor on Dec 26, 2025, 2:15 PM
Comments: Please recheck fire extinguisher #5
```

---

## Folder Structure

Files organized automatically:

```
HSE/New Document/
├── Fire_Extinguisher/
│   └── 2025/
│       └── December/
│           └── Fire_Extinguisher_December_2025_INS-001.xlsx
├── First_Aid/
│   └── 2025/
│       └── December/
│           └── First_Aid_December_2025_INS-002.xlsx
├── HSE_Inspection/
└── Manhours_Report/
```

---

## Quick Checklist

- [ ] Added `Sites.ReadWrite.All` permission to existing Azure AD app
- [ ] Granted admin consent (green checkmark)
- [ ] Created **InspectionInfo** column in SharePoint
- [ ] Created **Status** column in SharePoint
- [ ] Added 6 environment variables to `.env.local`
- [ ] Ran `npx supabase db push`
- [ ] Restarted app with `npm run dev`
- [ ] Submitted test inspection
- [ ] Verified file in SharePoint with metadata
- [ ] Tested approve/reject status update

---

## Troubleshooting

**Error: "Failed to get access token"**
- Check that you granted admin consent (Step 1, step 10)
- Verify Client Secret is correct in `.env.local`
- Make sure you added **Application permissions**, not Delegated

**Error: "Metadata update failed"**
- Column names must be exactly: `InspectionInfo` and `Status`
- Check spelling and capitalization (case-sensitive)
- No spaces: `InspectionInfo` not `Inspection Info`

**Files upload but no metadata**
- Verify columns were created in the correct library (Shared Documents)
- Check column internal names match exactly
- Look at `sharepoint_sync_log` table for errors

**Can't find Client ID/Tenant ID/Secret?**
- Azure Portal → Azure AD → App registrations → Your app → Overview
- Client Secret: Certificates & secrets (create new one if expired)

---

## Benefits

✅ **FREE** - No Power Automate Premium needed
✅ **Simple** - Only 2 columns instead of 8
✅ **Automatic** - No user interaction needed
✅ **Complete info** - All data in readable format
✅ **Reuses** - Same credentials as Microsoft login

---

## Support

Check the logs:
```sql
-- See if uploads succeeded
SELECT * FROM sharepoint_sync_log ORDER BY created_at DESC;

-- Check for errors
SELECT * FROM sharepoint_sync_log WHERE status = 'failure';
```

---

**That's it! Your setup is complete! 🎉**

Inspections will automatically export to SharePoint with clean, readable metadata in just 2 columns.
