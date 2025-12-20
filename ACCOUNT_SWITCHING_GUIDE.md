# Microsoft Account Switching Guide

## Summary of Changes

### 1. Fixed Role Assignment (✅ Complete)
- **File:** `src/pages/api/auth/microsoft/callback.ts`
- **Change:** Role is now **always updated** on every login based on your `.env` email whitelists
- **Impact:** Even existing users will get their roles corrected on next login

### 1.5 Microsoft Profile Picture Integration (✅ Complete)
- **Files:** Multiple (see `MICROSOFT_PROFILE_PICTURE_GUIDE.md` for details)
- **Change:** Automatically displays Microsoft profile pictures in the app
- **Impact:** Users see their Microsoft profile picture in the navigation bar
- **Fallback:** Shows gradient avatar with initial if no picture available

### 2. Added Account Selection Prompt (✅ Complete)
- **File:** `src/utils/microsoft-auth.ts:109`
- **Change:** Added `prompt: 'select_account'` to Microsoft OAuth URL
- **Impact:** Every time you click "Sign in with Microsoft", you'll see the account picker

### 3. Added Microsoft Logout Function (✅ Complete)
- **File:** `src/utils/microsoft-auth.ts:128-141`
- **Change:** New `getMicrosoftLogoutUrl()` function
- **Impact:** Can now fully clear Microsoft session to switch accounts

### 4. Updated Logout UI (✅ Complete)
- **Files:**
  - `src/components/RoleBasedNav.tsx` (Desktop)
  - `src/components/MobileBottomNav.tsx` (Mobile)
- **Change:** Logout redirects directly to login page
- **Impact:** Clean logout flow - user sees login UI, then account picker appears when clicking "Sign in with Microsoft"

## Current Configuration

Your `.env` file is already correctly configured:

```env
INSPECTOR_EMAIL_WHITELIST=aimi.azizul@theta-edge.com
SUPERVISOR_EMAIL_WHITELIST=supervisor@theta-edge.com
ADMIN_EMAIL_WHITELIST=hse-platform@theta-edge.com
```

## How to Clear the Database

### Option 1: Supabase Dashboard (Recommended)
1. Go to: https://ooriqpeqtfmgfynlbsxb.supabase.co
2. Click "SQL Editor" in left sidebar
3. Run this SQL:
   ```sql
   DELETE FROM user_permissions;
   DELETE FROM users;
   ```

### Option 2: Apply Migration
Run the migration file created at:
```bash
supabase/migrations/013_clear_all_users.sql
```

## How to Switch Accounts

**Simple:** Just logout and login again

1. Click the **Logout** button
2. You're redirected to the **login page** (your app's login UI)
3. Click **"Sign in with Microsoft"** button
4. Microsoft account picker appears - choose any account you want
5. Role is automatically assigned based on the email

**Why this works:**
- `prompt: 'select_account'` parameter forces the account picker every time
- You always see your login page first (familiar UI)
- Account picker only appears when you click "Sign in with Microsoft"
- No need to go through Microsoft logout page

## Testing the Changes

1. **Clear database** (optional, but recommended for fresh start)
2. **Login** with `aimi.azizul@theta-edge.com`
3. Verify you're assigned **inspector** role
4. To switch accounts:
   - Click **Logout** dropdown → **Switch Account**
   - Login with a different email
   - New role should be assigned based on `.env` configuration

## Role Assignment Rules

The system follows this priority:

1. **Email Whitelist** (Highest Priority)
   - Checks `INSPECTOR_EMAIL_WHITELIST`
   - Checks `SUPERVISOR_EMAIL_WHITELIST`
   - Checks `ADMIN_EMAIL_WHITELIST`

2. **Job Title/Department** (Fallback)
   - Job titles containing: "admin", "manager" → admin
   - Job titles containing: "supervisor", "lead" → supervisor
   - Job titles containing: "inspector", "hse", "safety" → inspector

3. **Default** → employee

## Files Changed

1. ✅ `src/pages/api/auth/microsoft/callback.ts` - Always update role on login
2. ✅ `src/utils/microsoft-auth.ts` - Add account picker & logout URL
3. ✅ `src/components/RoleBasedNav.tsx` - Logout dropdown menu
4. ✅ `src/components/MobileBottomNav.tsx` - Logout modal
5. ✅ `supabase/migrations/013_clear_all_users.sql` - Database cleanup script

## Need Help?

- Role not updating? Make sure to fully logout and login again
- Account picker not showing? Clear your browser cookies for the site
- Still having issues? Check the browser console for errors
