# Profile Photo Not Showing - Troubleshooting Guide

## Issue
Microsoft profile photos are not displaying after login.

## Debugging Added ✅

I've added comprehensive logging throughout the authentication flow. Check your browser console and server terminal for these debug messages:

### 1. Microsoft Graph API Fetch (Server-side)
**File**: `src/utils/microsoft-auth.ts`

Look for these logs in your **server terminal**:
```
[Microsoft Auth] Fetching profile photo from Graph API...
[Microsoft Auth] Profile photo response OK, converting to base64...
[Microsoft Auth] Blob size: XXXX bytes, type: image/jpeg
[Microsoft Auth] Profile photo converted to base64, length: XXXX
[Microsoft Auth] User info fetched: { displayName: "...", hasProfilePicture: true, profilePictureLength: XXXX }
```

**OR if no photo:**
```
[Microsoft Auth] No profile photo available (status: 404)
```

### 2. Database Storage (Server-side)
**File**: `src/pages/api/auth/microsoft/callback.ts`

Look for these logs in your **server terminal**:
```
Updating user with profile picture { userId: "...", hasProfilePicture: true, pictureLength: XXXX }
```

**OR:**
```
No profile picture to update { userId: "..." }
```

### 3. API Response (Server-side)
**File**: `src/pages/api/auth/me.ts`

Look for these logs in your **server terminal**:
```
[/api/auth/me] User data: { userId: "...", name: "...", hasProfilePicture: true, profilePictureLength: XXXX }
```

### 4. Client-side Auth Hook (Browser)
**File**: `src/hooks/useAuth.ts`

Look for these logs in your **browser console** (F12):
```
[useAuth] Session restored from cookie: { name: "...", hasProfilePicture: true, profilePictureLength: XXXX }
[useAuth] Restored user object: { name: "...", hasProfilePicture: true, profilePictureLength: XXXX }
```

### 5. Avatar Component (Browser)
**File**: `src/components/UserAvatar.tsx`

Look for these logs in your **browser console** (F12):
```
[UserAvatar] Debug: { hasProfilePicture: true, profilePictureLength: XXXX, userName: "..." }
[UserAvatarIcon] Debug: { hasProfilePicture: true, profilePictureLength: XXXX, userName: "..." }
```

## Troubleshooting Steps

### Step 1: Check Database Migration ⚠️ IMPORTANT
The `profile_picture` column must exist in your database.

**Run this migration:**
```sql
-- Open Supabase Dashboard → SQL Editor
-- Or run via your database tool

ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;

COMMENT ON COLUMN users.profile_picture IS 'User profile picture URL or base64 data (from Microsoft account or uploaded)';
```

**Verify column exists:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'profile_picture';
```

### Step 2: Test Microsoft Login
1. **Logout** completely from the app
2. **Clear browser cache and localStorage** (F12 → Application → Clear storage)
3. **Login again via Microsoft**
4. **Open browser console** (F12) and check for debug logs
5. **Open server terminal** and check for debug logs

### Step 3: Verify Microsoft Profile Photo Exists
1. Go to https://myaccount.microsoft.com/
2. Check if you have a profile photo set
3. If not, add one and wait a few minutes for it to sync

### Step 4: Check Browser Console
After login, check browser console (F12) for:
- `[UserAvatar] Debug:` or `[UserAvatarIcon] Debug:` messages
- Any error messages about failed image loads
- The `hasProfilePicture` value should be `true`
- The `profilePictureLength` should be > 0 (typically 10000-50000 for base64 images)

### Step 5: Check Server Terminal
After login, check server terminal for:
- Microsoft Graph API fetch logs
- Database update/insert logs with profile picture
- Any error messages

### Step 6: Inspect Database Directly
```sql
-- Check if profile_picture is being stored
SELECT id, name, email, 
       LENGTH(profile_picture) as picture_length,
       LEFT(profile_picture, 30) as picture_preview
FROM users
WHERE email = 'your-email@example.com';
```

Expected result:
- `picture_length` should be > 0 (e.g., 15000-50000 for base64)
- `picture_preview` should start with `data:image/jpeg;base64,` or `data:image/png;base64,`

### Step 7: Check localStorage
1. Open browser console (F12)
2. Go to Application → Local Storage
3. Find `currentUser` key
4. Check if `profilePicture` field exists and has data

```javascript
// Run this in browser console
const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
console.log('Has profile picture:', !!user.profilePicture);
console.log('Profile picture length:', (user.profilePicture || '').length);
console.log('Profile picture preview:', (user.profilePicture || '').substring(0, 50));
```

## Common Issues & Solutions

### Issue 1: Profile picture column doesn't exist
**Symptom:** Database errors in server logs
**Solution:** Run the migration in Step 1

### Issue 2: Microsoft account has no profile photo
**Symptom:** Logs show `No profile photo available (status: 404)`
**Solution:** 
- Add a profile photo to your Microsoft account
- Wait a few minutes for it to sync
- Logout and login again

### Issue 3: Profile picture too large
**Symptom:** Database insert/update fails, or very slow loading
**Solution:** 
- Microsoft photos are usually reasonable size (< 100KB)
- Check if the base64 string is extremely long (> 200000 characters)
- May need to add image compression

### Issue 4: CORS or fetch errors
**Symptom:** Errors fetching from Microsoft Graph API
**Solution:**
- Verify Microsoft app permissions include `User.Read`
- Check network tab for failed requests
- Verify access token is valid

### Issue 5: Component not receiving profile picture
**Symptom:** Database has photo, but component shows fallback
**Solution:**
- Check browser console for `[UserAvatar] Debug:` logs
- Verify user object in React DevTools
- Check if profilePicture prop is being passed correctly

### Issue 6: Old session cached
**Symptom:** Profile picture doesn't show after it was added
**Solution:**
1. Clear localStorage: `localStorage.clear()`
2. Clear cookies
3. Logout and login again
4. Check if new session has profilePicture

## Expected Flow

When everything works correctly:

1. **Login** → Microsoft OAuth redirect
2. **Callback** → Fetch user info + profile photo from Microsoft Graph
3. **Store** → Save base64 profile photo to database `users.profile_picture`
4. **Token** → Create JWT auth token
5. **Redirect** → Back to app with auth cookie
6. **Restore Session** → Fetch user from database (includes profile_picture)
7. **Render** → UserAvatar component receives profilePicture prop
8. **Display** → Show `<img src={profilePicture} />` or fallback avatar

## Quick Test

Run this in your browser console after logging in:

```javascript
// Check if profile picture is in current user
const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
console.log('User:', user.name);
console.log('Has profile picture:', !!user.profilePicture);
console.log('Picture length:', (user.profilePicture || '').length);
console.log('Picture starts with:', (user.profilePicture || '').substring(0, 30));

// Should output something like:
// User: John Doe
// Has profile picture: true
// Picture length: 23456
// Picture starts with: data:image/jpeg;base64,/9j/4A
```

## Need More Help?

If profile picture still doesn't show:

1. **Share the debug logs** from browser console and server terminal
2. **Check database** directly with the SQL query in Step 6
3. **Verify** Microsoft account actually has a profile photo
4. **Try** another Microsoft account that definitely has a photo
5. **Check** if `profile_picture` column exists in database

The debug logs will show exactly where in the flow the profile picture is getting lost.

