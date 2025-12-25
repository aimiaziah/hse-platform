# SharePoint OAuth Integration Setup Guide

This guide will help you set up **automatic, free SharePoint integration** for inspection form exports using OAuth (no Power Automate Premium needed!).

---

## Overview

- ✅ **100% Free** - No Power Automate Premium required
- ✅ **Automatic** - Uploads happen in background
- ✅ **Server-side** - No user popups or interaction needed
- ✅ **Secure** - Uses Azure AD app-only permissions

---

## Prerequisites

1. **Global Administrator** or **Application Administrator** access to your Microsoft 365 tenant
2. SharePoint site already created: `https://thetaedgebhd.sharepoint.com/sites/ThetaEdge`
3. Document library ready: `Shared Documents`

---

## Step 1: Create Azure AD App Registration

### 1.1 Go to Azure Portal
1. Open https://portal.azure.com
2. Sign in with your admin account
3. Navigate to **Azure Active Directory**

### 1.2 Register New Application
1. Click **App registrations** (left menu)
2. Click **+ New registration**
3. Fill in the form:
   - **Name**: `Inspection App SharePoint Integration`
   - **Supported account types**: `Accounts in this organizational directory only (Theta Edge only - Single tenant)`
   - **Redirect URI**: Leave blank for now
4. Click **Register**

### 1.3 Copy Application Details
After registration, you'll see the app overview page. **Copy these values**:

- **Application (client) ID**: e.g., `abc123-def456-ghi789`
- **Directory (tenant) ID**: e.g., `xyz987-uvw654-rst321`

---

## Step 2: Create Client Secret

### 2.1 Generate Secret
1. In your app, click **Certificates & secrets** (left menu)
2. Click **+ New client secret**
3. Fill in:
   - **Description**: `Inspection App Server Secret`
   - **Expires**: `24 months` (recommended)
4. Click **Add**

### 2.2 Copy Secret Value
**IMPORTANT**: Copy the secret **Value** immediately (it will only show once!)

Example: `abc~123.456-xyz_789`

**Store this securely** - you'll need it for the environment variable.

---

## Step 3: Grant API Permissions

### 3.1 Add Microsoft Graph Permissions
1. Click **API permissions** (left menu)
2. Click **+ Add a permission**
3. Select **Microsoft Graph**
4. Select **Application permissions** (not Delegated)
5. Search and add:
   - ✅ **Sites.ReadWrite.All** - Read and write items in all site collections
   - ✅ **Files.ReadWrite.All** - Read and write files in all site collections (optional, included in Sites.ReadWrite.All)

### 3.2 Grant Admin Consent
**CRITICAL STEP**: After adding permissions:
1. Click **Grant admin consent for [Your Organization]**
2. Click **Yes** to confirm
3. Wait for status to show green checkmarks ✅

**Without admin consent, the integration will not work!**

---

## Step 4: Configure SharePoint Custom Columns

### 4.1 Navigate to Document Library
1. Go to: https://thetaedgebhd.sharepoint.com/sites/ThetaEdge/Shared Documents
2. Click **⚙ Settings** icon (top right)
3. Click **Library settings**

### 4.2 Create Custom Columns
Click **Create column** and add each of these:

#### Column 1: Inspection Number
- **Column name**: `InspectionNumber`
- **Type**: Single line of text
- Click **OK**

#### Column 2: Inspection Type
- **Column name**: `InspectionType`
- **Type**: Choice
- **Choices** (one per line):
  ```
  Fire Extinguisher
  First Aid
  HSE Inspection
  Manhours Report
  ```
- **Default value**: Leave blank
- Click **OK**

#### Column 3: Inspector Name
- **Column name**: `InspectorName`
- **Type**: Single line of text
- Click **OK**

#### Column 4: Submission Date
- **Column name**: `SubmissionDate`
- **Type**: Date and Time
- **Format**: Date & Time
- Click **OK**

#### Column 5: Status
- **Column name**: `Status`
- **Type**: Single line of text
- Click **OK**

#### Column 6: Reviewer Name
- **Column name**: `ReviewerName`
- **Type**: Single line of text
- Click **OK**

#### Column 7: Review Date
- **Column name**: `ReviewDate`
- **Type**: Date and Time
- **Format**: Date & Time
- Click **OK**

#### Column 8: Review Comments
- **Column name**: `ReviewComments`
- **Type**: Multiple lines of text
- **Number of lines**: 6
- Click **OK**

---

## Step 5: Update Environment Variables

### 5.1 Edit `.env.local`
Add these variables to your `.env.local` file:

```bash
# SharePoint OAuth Integration (Free!)
NEXT_PUBLIC_SHAREPOINT_SITE_URL=https://thetaedgebhd.sharepoint.com/sites/ThetaEdge
NEXT_PUBLIC_SHAREPOINT_TENANT_ID=xyz987-uvw654-rst321  # From Step 1.3
NEXT_PUBLIC_SHAREPOINT_OAUTH_CLIENT_ID=abc123-def456-ghi789  # From Step 1.3
SHAREPOINT_CLIENT_SECRET=abc~123.456-xyz_789  # From Step 2.2
SHAREPOINT_LIBRARY_NAME=Shared Documents
SHAREPOINT_BASE_FOLDER=HSE/New Document
```

### 5.2 Verify Configuration
✅ All 6 SharePoint variables are set
✅ Tenant ID matches your Azure AD
✅ Client ID matches your app registration
✅ Client secret is the **Value**, not the Secret ID
✅ Site URL is correct (no trailing slash)

---

## Step 6: Run Database Migration

Apply the SharePoint tracking migration:

```bash
# Navigate to your project directory
cd C:\Users\Aimi\Desktop\inspection-app\pwa-inspection

# Apply the migration
npx supabase db push

# Or if using Supabase CLI
supabase migration up
```

This adds SharePoint tracking columns to your `inspections` table.

---

## Step 7: Restart Your Application

```bash
# Stop the dev server (Ctrl+C)
# Restart it
npm run dev
```

The app will now load the new SharePoint configuration.

---

## Step 8: Test the Integration

### 8.1 Submit a Test Inspection
1. Log in as an inspector
2. Fill out any inspection form (e.g., Fire Extinguisher)
3. Submit the form
4. Check the console logs for:
   ```
   📤 Uploading Fire Extinguisher to SharePoint via OAuth...
   ✅ SharePoint upload successful: https://...
   ```

### 8.2 Check SharePoint
1. Go to: https://thetaedgebhd.sharepoint.com/sites/ThetaEdge/Shared Documents
2. Navigate to: `HSE/New Document/Fire_Extinguisher/2025/December/`
3. Verify:
   - ✅ Excel file is uploaded
   - ✅ File name format: `Fire_Extinguisher_December_2025_INS-001.xlsx`
   - ✅ Metadata columns are populated:
     - Inspection Number
     - Inspection Type
     - Inspector Name
     - Submission Date
     - Status = "Submitted by [Inspector Name]"

### 8.3 Test Status Update
1. Log in as a supervisor
2. Approve or reject the inspection
3. Check SharePoint - verify:
   - ✅ Status updated to "Approved by [Supervisor Name]" or "Rejected by [Supervisor Name]"
   - ✅ Reviewer Name is populated
   - ✅ Review Date is set
   - ✅ Review Comments (if provided) are populated

---

## Troubleshooting

### Error: "Failed to get access token"
**Cause**: Invalid client secret or app configuration

**Fix**:
1. Verify `SHAREPOINT_CLIENT_SECRET` matches the secret **Value** (not ID)
2. Check tenant ID and client ID are correct
3. Generate a new client secret if the old one expired

---

### Error: "Failed to get site info"
**Cause**: Incorrect site URL or insufficient permissions

**Fix**:
1. Verify `NEXT_PUBLIC_SHAREPOINT_SITE_URL` is correct
2. Ensure it matches: `https://thetaedgebhd.sharepoint.com/sites/ThetaEdge`
3. No trailing slash
4. Check app has **Sites.ReadWrite.All** permission with admin consent

---

### Error: "Document library not found"
**Cause**: Library name doesn't match

**Fix**:
1. Verify `SHAREPOINT_LIBRARY_NAME=Shared Documents` (with space!)
2. Library must exist in the SharePoint site
3. Check spelling and capitalization exactly

---

### Error: "Metadata update failed"
**Cause**: Column names don't match

**Fix**:
1. Column names are **case-sensitive**
2. Must be exactly: `InspectionNumber`, `InspectionType`, `InspectorName`, etc.
3. No spaces in column names (use the **internal name**)
4. Verify all 8 columns were created in Step 4

---

### Files Upload but No Metadata
**Possible causes**:
1. Columns not created in SharePoint
2. Column names don't match exactly
3. Check SharePoint sync log:
   ```sql
   SELECT * FROM sharepoint_sync_log WHERE status = 'failure' ORDER BY created_at DESC;
   ```

**Fix**: Recreate columns with exact names from Step 4

---

### Admin Consent Not Granted
**Symptom**: Error about permissions

**Fix**:
1. Go to Azure Portal → App registrations → Your app
2. Click **API permissions**
3. Click **Grant admin consent for [Organization]**
4. Verify green checkmarks appear

---

## Security Notes

🔒 **Client Secret Security**:
- ✅ Stored in `.env.local` (never committed to git)
- ✅ Used server-side only (never sent to browser)
- ✅ Rotate every 12-24 months
- ✅ Keep in secure location (password manager)

🔒 **App Permissions**:
- ✅ App can only access SharePoint sites
- ✅ Cannot access user emails or personal data
- ✅ Limited to `Sites.ReadWrite.All` scope
- ✅ No user delegation - runs as application

---

## Folder Structure

Files will be organized automatically:

```
HSE/New Document/
├── Fire_Extinguisher/
│   ├── 2025/
│   │   ├── January/
│   │   ├── February/
│   │   └── December/
│   │       └── Fire_Extinguisher_December_2025_INS-001.xlsx
├── First_Aid/
│   └── 2025/
│       └── December/
│           └── First_Aid_December_2025_INS-002.xlsx
├── HSE_Inspection/
│   └── ...
└── Manhours_Report/
    └── ...
```

---

## Success Checklist

Before considering the integration complete, verify:

- [ ] Azure AD app registered with correct permissions
- [ ] Admin consent granted (green checkmarks in Azure Portal)
- [ ] Client secret created and saved securely
- [ ] All 8 SharePoint columns created with correct names
- [ ] All 6 environment variables set in `.env.local`
- [ ] Database migration applied successfully
- [ ] Application restarted after env changes
- [ ] Test inspection submitted successfully
- [ ] Excel file appears in SharePoint with correct folder structure
- [ ] All metadata columns populated correctly
- [ ] Status update tested (approve/reject works)
- [ ] No errors in `sharepoint_sync_log` table

---

## Support

If you encounter issues:

1. Check the `sharepoint_sync_log` table for errors
2. Review server logs for detailed error messages
3. Verify all environment variables are set correctly
4. Ensure admin consent is granted in Azure Portal
5. Double-check column names match exactly (case-sensitive)

---

## Benefits Over Power Automate

| Feature | OAuth (This Approach) | Power Automate |
|---------|----------------------|----------------|
| Cost | ✅ Free | ❌ $15/user/month |
| Setup Time | 20 minutes | 30 minutes |
| User Interaction | ✅ None (automatic) | ✅ None (with Premium) |
| Error Handling | ✅ Detailed logs | ⚠️ Limited visibility |
| Debugging | ✅ Full server logs | ⚠️ Flow run history |
| Reliability | ✅ Direct API | ⚠️ Depends on flow service |
| Customization | ✅ Full control | ⚠️ Limited to flow actions |

---

**Congratulations! Your SharePoint integration is now configured! 🎉**

Inspections will automatically export to SharePoint with full metadata tracking.
