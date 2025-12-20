# Push Notifications Setup Guide

This guide explains how to set up and use the push notification system in the HSE Inspection Platform.

## Overview

The push notification system enables real-time notifications for:

- **Supervisors**: When inspections are assigned for review
- **Inspectors**: When their inspections are approved or rejected

Notifications work even when the browser is closed, as long as the user has subscribed to push notifications.

## Architecture

### Components

1. **Service Worker** (`public/sw-push.js`)

   - Handles push events from the push service
   - Displays notifications
   - Manages notification clicks and actions

2. **Client Library** (`src/lib/push-notifications.ts`)

   - Manages subscription lifecycle
   - Requests notification permissions
   - Communicates with backend APIs

3. **Backend APIs** (`src/pages/api/notifications/`)

   - `subscribe.ts` - Save push subscriptions
   - `unsubscribe.ts` - Remove subscriptions
   - `send.ts` - Send notifications to users
   - `preferences.ts` - Manage user preferences
   - `subscriptions.ts` - List user's devices
   - `vapid-public-key.ts` - Get public VAPID key
   - `log.ts` - Track notification events

4. **Database Tables**

   - `push_subscriptions` - Store push endpoints
   - `notification_preferences` - User notification settings
   - `notification_log` - Audit trail of sent notifications

5. **UI Components**
   - `PushNotificationButton` - Enable/disable notifications
   - `NotificationBell` - Display notification icon
   - `settings/notifications.tsx` - Full settings page

## Setup Instructions

### Step 1: Install Dependencies

```bash
npm install web-push@latest
```

### Step 2: Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required for Web Push authentication.

```bash
node scripts/generate-vapid-keys.js
```

This will output something like:

```
============================================================
VAPID KEYS GENERATED SUCCESSFULLY!
============================================================

📋 Add these to your .env file:

# VAPID keys for Web Push notifications
VAPID_PUBLIC_KEY=BKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_PRIVATE_KEY=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
VAPID_SUBJECT=mailto:admin@yourdomain.com

============================================================
⚠️  IMPORTANT: Keep the private key SECRET!
✅ The public key can be shared with clients.
============================================================
```

### Step 3: Configure Environment Variables

Add the generated keys to your `.env` file:

```env
# Push Notifications (Web Push VAPID)
VAPID_PUBLIC_KEY=your_generated_public_key_here
VAPID_PRIVATE_KEY=your_generated_private_key_here
VAPID_SUBJECT=mailto:admin@inspection.local

# Base URL for API calls (used for internal notifications)
NEXT_PUBLIC_BASE_URL=http://localhost:8080
```

**For production:**

```env
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

### Step 4: Run Database Migration

Apply the push notification tables to your Supabase database:

```bash
# Using Supabase CLI
supabase db push supabase/migrations/015_create_push_subscriptions.sql
```

Or manually execute the SQL in your Supabase dashboard:

- Go to SQL Editor
- Paste contents of `supabase/migrations/015_create_push_subscriptions.sql`
- Run the migration

### Step 5: Update Service Worker Configuration

The service worker for push notifications is already configured in `public/sw-push.js`. The next-pwa package will automatically integrate it.

Verify in `next.config.js` that PWA is properly configured:

```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // ... rest of config
});
```

### Step 6: Verify Manifest Settings

Check `public/manifest.json` has proper icons for notifications:

```json
{
  "name": "HSE Inspection Platform",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

## Usage

### For End Users

#### Enable Push Notifications

1. Log in to the platform
2. Navigate to Settings → Notifications
3. Click "Enable Notifications"
4. Allow notifications when prompted by the browser

#### Configure Preferences

In the notification settings page, users can:

- Choose which types of notifications to receive
- Set quiet hours (e.g., 10 PM - 8 AM)
- Manage connected devices
- Remove old devices

### For Developers

#### Sending Notifications Programmatically

```typescript
// Send to a specific user
await fetch('/api/notifications/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-uuid',
    notificationType: 'inspection_assigned',
    title: 'New Inspection',
    body: 'You have a new inspection to review',
    data: {
      inspectionId: 'inspection-uuid',
      url: '/supervisor/review/inspection-uuid',
    },
    inspectionId: 'inspection-uuid',
  }),
});

// Send to multiple users by role
await fetch('/api/notifications/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    role: 'supervisor',
    notificationType: 'general',
    title: 'System Announcement',
    body: 'The system will be under maintenance tonight',
  }),
});
```

#### Notification Types

- `inspection_assigned` - Supervisor gets new inspection
- `inspection_approved` - Inspector's work approved
- `inspection_rejected` - Inspector's work needs revision
- `comment_added` - New comment on inspection
- `general` - General notifications

#### Adding Custom Notification Actions

Edit `public/sw-push.js` to add custom action buttons:

```javascript
const payload = {
  title: 'New Inspection',
  body: 'Review required',
  actions: [
    { action: 'review', title: 'Review Now', icon: '/icon-check.png' },
    { action: 'dismiss', title: 'Later', icon: '/icon-close.png' },
  ],
};
```

## Testing

### Test Notifications Locally

1. Start the development server:

   ```bash
   npm run dev
   ```

2. Open the app in a browser
3. Enable notifications
4. Open browser DevTools → Application → Service Workers
5. Verify the service worker is registered

### Send Test Notification

Use the settings page or create a test endpoint:

```typescript
// In your component
import { showTestNotification } from '@/lib/push-notifications';

// Show test notification
await showTestNotification();
```

### Debug Service Worker

1. Open DevTools → Application → Service Workers
2. Check the console for push events
3. Use "Update on reload" for development
4. Clear service workers if needed

## Troubleshooting

### Notifications Not Appearing

**Issue**: User doesn't receive notifications

**Solutions**:

1. Check browser permissions:

   - Chrome: Settings → Privacy → Site Settings → Notifications
   - Firefox: Settings → Privacy → Permissions → Notifications
   - Safari: Preferences → Websites → Notifications

2. Verify service worker is active:

   - DevTools → Application → Service Workers
   - Should show "activated and running"

3. Check subscription status:

   - Navigate to Settings → Notifications
   - Verify device is listed under "Connected Devices"

4. Test VAPID keys:
   ```bash
   node -e "console.log('Public key length:', process.env.VAPID_PUBLIC_KEY?.length)"
   # Should output: Public key length: 87 or 88
   ```

### Service Worker Not Registering

**Issue**: Service worker fails to register

**Solutions**:

1. Ensure HTTPS (or localhost for development)
2. Check service worker file exists: `public/sw-push.js`
3. Verify next-pwa configuration in `next.config.js`
4. Clear cache: DevTools → Application → Clear storage

### VAPID Key Errors

**Issue**: "VAPID public key is invalid" error

**Solutions**:

1. Regenerate keys:

   ```bash
   node scripts/generate-vapid-keys.js
   ```

2. Ensure no trailing spaces in `.env` file
3. Restart the development server after updating `.env`

### Database Errors

**Issue**: Subscription not saved to database

**Solutions**:

1. Verify migration was applied:

   ```sql
   SELECT * FROM push_subscriptions LIMIT 1;
   ```

2. Check table permissions in Supabase
3. Verify service role key has proper permissions

## Browser Support

| Browser        | Support    | Notes              |
| -------------- | ---------- | ------------------ |
| Chrome         | ✅ Full    | Best support       |
| Edge           | ✅ Full    | Chromium-based     |
| Firefox        | ✅ Full    | Good support       |
| Safari (iOS)   | ⚠️ Partial | Requires iOS 16.4+ |
| Safari (macOS) | ✅ Full    | macOS 13+          |
| Opera          | ✅ Full    | Chromium-based     |

## Security Considerations

1. **VAPID Keys**:

   - Keep private key secret
   - Never commit to version control
   - Rotate if compromised

2. **Endpoint Security**:

   - Push subscriptions are tied to user accounts
   - Expired subscriptions are automatically cleaned up
   - Users can revoke access anytime

3. **Data Privacy**:
   - Notification logs for audit purposes
   - Users control what notifications they receive
   - Quiet hours respect user preferences

## Performance

- Notifications are sent in batches of 10 concurrent requests
- Expired subscriptions are removed automatically
- Service worker caches are managed by next-pwa
- Push events are handled even when app is closed

## Production Checklist

Before deploying to production:

- [ ] VAPID keys generated and added to `.env`
- [ ] Database migration applied
- [ ] HTTPS enabled (required for service workers)
- [ ] `NEXT_PUBLIC_BASE_URL` set to production URL
- [ ] Service worker tested on multiple devices
- [ ] Notification icons generated (192x192, 512x512)
- [ ] Browser permissions tested
- [ ] Quiet hours functionality verified
- [ ] Audit log monitoring enabled

## API Reference

### Client-Side

```typescript
import {
  isPushNotificationSupported,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getCurrentPushSubscription,
  initializePushNotifications,
  showTestNotification,
} from '@/lib/push-notifications';
```

### Server-Side

```typescript
import {
  sendPushNotification,
  sendPushNotificationToMultiple,
  initializeWebPush,
  getVAPIDKeys,
} from '@/lib/web-push';
```

## Further Reading

- [Web Push API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker Lifecycle](https://developer.chrome.com/docs/workbox/service-worker-lifecycle/)
- [VAPID Specification](https://tools.ietf.org/html/rfc8292)
- [Next.js PWA Guide](https://github.com/shadowwalker/next-pwa)

## Support

For issues or questions:

1. Check this documentation
2. Review browser console for errors
3. Check service worker status
4. Verify database migrations applied
5. Test with a different browser

---

**Last Updated**: December 2025
**Version**: 1.0
