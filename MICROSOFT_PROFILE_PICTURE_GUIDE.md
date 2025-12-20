# Microsoft Profile Picture Integration

## Overview

Users who login via Microsoft account will now automatically have their Microsoft profile picture displayed in the app. If a user doesn't have a profile picture, a colorful avatar with their initial will be shown instead.

## What Was Changed

### 1. Database Schema ✅
**File:** `supabase/migrations/014_add_profile_picture.sql`
- Added `profile_picture` TEXT column to `users` table
- Stores base64-encoded image data or URL

**To apply:**
```sql
-- Via Supabase Dashboard SQL Editor
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;
```

### 2. Microsoft Graph API Integration ✅
**File:** `src/utils/microsoft-auth.ts`

**New Function:** `getMicrosoftUserPhoto()`
- Fetches user's profile photo from Microsoft Graph API (`/me/photo/$value`)
- Converts image blob to base64 data URL
- Returns `null` if user has no profile picture

**Updated:** `getMicrosoftUserInfo()`
- Now includes `profilePictureUrl` in returned user info
- Automatically fetches profile photo when getting user data

**Interface Updated:**
```typescript
export interface MicrosoftUserInfo {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
  jobTitle?: string;
  department?: string;
  profilePictureUrl?: string; // NEW
}
```

### 3. Microsoft OAuth Callback ✅
**File:** `src/pages/api/auth/microsoft/callback.ts`

**Changes:**
- Stores profile picture when creating new users (line 170)
- Updates profile picture on every login (line 112)
- Ensures profile picture stays in sync with Microsoft account

### 4. Authentication APIs ✅

**Updated Files:**
- `src/pages/api/auth/login.ts` - PIN login returns profile picture
- `src/pages/api/auth/me.ts` - Session restore includes profile picture

**User Response includes:**
```typescript
{
  id: string;
  email: string;
  name: string;
  role: string;
  signature?: string | null;
  profilePicture?: string | null; // NEW
  permissions: {...}
}
```

### 5. User Interface ✅
**File:** `src/hooks/useAuth.ts`

**User Interface Updated:**
```typescript
export interface User {
  id: string;
  name: string;
  pin: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  signature?: string | null;
  profilePicture?: string | null; // NEW
  permissions: {...};
}
```

### 6. UI Components ✅
**File:** `src/components/RoleBasedNav.tsx`

**Desktop Navigation:**
- Displays circular profile picture (40x40px) next to user name
- Fallback to gradient avatar with user's initial if no picture
- Avatar colors: Blue gradient (from-blue-500 to-indigo-600)

**Visual:**
```
┌──────────────────────────────────────┐
│  [Photo] John Doe        [Logout]   │
│          Inspector                   │
└──────────────────────────────────────┘
```

## How It Works

### Login Flow
1. User clicks "Sign in with Microsoft"
2. Microsoft OAuth redirects to callback
3. Callback fetches user info + profile photo from Microsoft Graph API
4. Profile photo converted to base64 data URL
5. Stored in database `profile_picture` column
6. Displayed in navigation bar

### Fallback Behavior
If user has no Microsoft profile picture:
- Shows circular avatar with gradient background
- Displays first letter of user's name in white
- Uses consistent blue-to-indigo gradient

### Data Format
Profile pictures are stored as base64 data URLs:
```
data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...
```

This allows:
- No external image hosting required
- Images work offline
- No CORS issues
- Immediate display

## Testing

### Test with Profile Picture
1. Login with a Microsoft account that has a profile picture
2. Check navigation bar - should show the Microsoft profile picture
3. Logout and login again - picture should update if changed in Microsoft

### Test without Profile Picture
1. Login with a Microsoft account without a profile picture
2. Check navigation bar - should show gradient avatar with first initial
3. Avatar should be circular with blue-to-indigo gradient

### Test Profile Picture Update
1. Login with Microsoft account
2. Go to Microsoft and change your profile picture
3. Logout and login to the app again
4. New profile picture should appear

## Database Migration

**Apply this migration to your Supabase database:**

```sql
-- Add profile_picture column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_picture TEXT;

COMMENT ON COLUMN users.profile_picture IS 'User profile picture URL or base64 data (from Microsoft account or uploaded)';
```

**Via Supabase Dashboard:**
1. Go to SQL Editor
2. Run the migration from `supabase/migrations/014_add_profile_picture.sql`
3. Or copy-paste the SQL above

## Files Changed

### Backend
1. ✅ `supabase/migrations/014_add_profile_picture.sql` - Database migration
2. ✅ `src/utils/microsoft-auth.ts` - Fetch profile photo from Microsoft
3. ✅ `src/pages/api/auth/microsoft/callback.ts` - Store profile picture
4. ✅ `src/pages/api/auth/login.ts` - Return profile picture in PIN login
5. ✅ `src/pages/api/auth/me.ts` - Return profile picture in session restore

### Frontend
6. ✅ `src/hooks/useAuth.ts` - Add profilePicture to User interface
7. ✅ `src/components/RoleBasedNav.tsx` - Display profile picture in navbar

## Known Limitations

1. **Microsoft API Permissions**: Requires `User.Read` scope (already included)
2. **Size Limit**: Base64 encoding increases data size by ~33%
3. **Large Images**: Very large profile pictures may exceed TEXT column limit
4. **No Upload**: Users can't upload custom pictures (only Microsoft profile pictures)

## Future Enhancements

Possible improvements:
- [ ] Compress images before storing
- [ ] Allow manual profile picture upload for PIN users
- [ ] Cache profile pictures to reduce API calls
- [ ] Add profile picture to more locations (comments, reviews, etc.)
- [ ] Support profile picture crop/resize

## Troubleshooting

### Profile Picture Not Showing
1. Check browser console for errors
2. Verify database has `profile_picture` column
3. Check Microsoft account actually has a profile picture
4. Verify Microsoft Graph API permissions

### Profile Picture Not Updating
1. Logout completely
2. Clear browser cache
3. Login again - callback always fetches fresh photo

### Avatar Shows Instead of Picture
- This is expected if user has no Microsoft profile picture
- Check Microsoft account settings to add a picture
