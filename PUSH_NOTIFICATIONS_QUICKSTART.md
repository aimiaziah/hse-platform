# Push Notifications - Quick Start Guide

## What Was Implemented

✅ **Complete push notification system for your PWA with:**

1. **Database Schema** - Tables for subscriptions, preferences, and logs
2. **Service Worker** - Handles push events even when browser is closed
3. **Backend APIs** - Send, subscribe, unsubscribe, and manage preferences
4. **UI Components** - Settings page and notification bell
5. **Integration** - Automatic notifications on inspection submission/review

## Quick Setup (5 minutes)

### 1. Install Dependencies

```bash
npm install
```

> **Note**: You have Node v24.8.0, but the project requires v18-21. Either:
>
> - Downgrade Node temporarily: `nvm use 18` or `nvm use 20`
> - Or override: `npm install --legacy-peer-deps`

### 2. Generate VAPID Keys

```bash
node scripts/generate-vapid-keys.js
```
VAPID_PUBLIC_KEY=BGMfub6KOsc81tdyjfrPSfALv7OUPYQddRX4mtkkkNjOsJZxNBit8lj1tOnUxGlkBw_CwowU2LmSCCmOIIQGO0w
VAPID_PRIVATE_KEY=MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgqS71wNPsTy_YGARlJCYTMtTb9oP8jSH1lnpLzUu2UfyhRANCAARjH7m-ijrHPNbXco36z0nwC7-zlD2EHXUV-JrZJJDYzrCWcTQYrfJY9bTp1MRpZAcPwsKMFNi5kggpjiCEBjtM
VAPID_SUBJECT=mailto:admin@yourdomain.com

Copy the output keys to your `.env` file:

```env
# Push Notifications
VAPID_PUBLIC_KEY=BKxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_PRIVATE_KEY=yyyyyyyyyyyyyyyyyyyyyyyy
VAPID_SUBJECT=mailto:admin@inspection.local

# Required for internal API calls
NEXT_PUBLIC_BASE_URL=http://localhost:8080
```

### 3. Run Database Migration

Execute in Supabase SQL Editor:

```sql
-- File: supabase/migrations/015_create_push_subscriptions.sql
```

Or using CLI:

```bash
supabase db push
```

### 4. Start the App

```bash
npm run dev
```

### 5. Test It

1. Open http://localhost:8080
2. Login as a supervisor
3. Go to Settings → Notifications
4. Click "Enable Notifications"
5. Allow browser permission
6. You should see a test notification!

## How It Works

### For Supervisors

```
Inspector submits form
    ↓
System auto-assigns to supervisor (load-balanced)
    ↓
Push notification sent: "New Inspection Assigned"
    ↓
Supervisor clicks notification
    ↓
Opens inspection review page
```

### For Inspectors

```
Supervisor reviews inspection
    ↓
Approves or Rejects
    ↓
Push notification sent to inspector
    ↓
Inspector clicks notification
    ↓
Opens submissions page
```

## File Structure

```
pwa-inspection/
├── public/
│   └── sw-push.js                          # Service worker for push
├── src/
│   ├── components/
│   │   ├── NotificationBell.tsx            # Notification icon
│   │   └── PushNotificationButton.tsx     # Enable/disable button
│   ├── lib/
│   │   ├── push-notifications.ts           # Client-side utilities
│   │   └── web-push.ts                     # Server-side utilities
│   └── pages/
│       ├── api/
│       │   └── notifications/
│       │       ├── subscribe.ts            # Save subscription
│       │       ├── unsubscribe.ts          # Remove subscription
│       │       ├── send.ts                 # Send notification
│       │       ├── preferences.ts          # User preferences
│       │       ├── subscriptions.ts        # List devices
│       │       ├── vapid-public-key.ts     # Get public key
│       │       └── log.ts                  # Track events
│       └── settings/
│           └── notifications.tsx           # Settings page
├── supabase/
│   └── migrations/
│       └── 015_create_push_subscriptions.sql
└── scripts/
    └── generate-vapid-keys.js              # Key generator
```

## Integration Points

### Automatic Notifications

1. **On Inspection Submission** (`src/pages/api/inspections/index.ts`)

   - Sends notification to assigned supervisor
   - Triggered when status is `pending_review`

2. **On Inspection Review** (`src/pages/api/inspections/[id].ts`)
   - Sends notification to inspector
   - Triggered when status changes to `approved` or `rejected`

### Manual Notifications

```typescript
// Send to specific user
await fetch('/api/notifications/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-uuid',
    notificationType: 'general',
    title: 'Title',
    body: 'Message',
  }),
});

// Send to all supervisors
await fetch('/api/notifications/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    role: 'supervisor',
    title: 'Announcement',
    body: 'Message to all supervisors',
  }),
});
```

## User Features

### Notification Types (User Can Toggle)

- ✅ Inspection Assignments (for supervisors)
- ✅ Inspection Approvals (for inspectors)
- ✅ Inspection Rejections (for inspectors)
- ✅ Comments on inspections

### Quiet Hours

Users can set hours when they don't want notifications (e.g., 10 PM - 8 AM)

### Device Management

Users can see all devices subscribed and remove old ones

## Testing

### Manual Test

1. Login as Inspector
2. Submit a fire extinguisher inspection
3. Note which supervisor it's assigned to
4. Login as that Supervisor (different browser/incognito)
5. Enable notifications
6. Go back to Inspector and submit the form
7. Supervisor should receive notification instantly!

### Test with cURL

```bash
# Get VAPID public key
curl http://localhost:8080/api/notifications/vapid-public-key

# Send test notification (requires auth cookie)
curl -X POST http://localhost:8080/api/notifications/send \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "userId": "supervisor-uuid",
    "title": "Test",
    "body": "This is a test"
  }'
```

## Troubleshooting

### "VAPID keys not configured"

- Run: `node scripts/generate-vapid-keys.js`
- Add keys to `.env`
- Restart dev server

### "Notifications not supported"

- Use HTTPS (or localhost)
- Try Chrome or Edge browser
- Check if service worker is registered (DevTools → Application)

### "Permission denied"

- Check browser settings: chrome://settings/content/notifications
- Clear site data and try again
- Test in incognito mode

### Service worker not registering

- Verify `public/sw-push.js` exists
- Check next.config.js has PWA config
- Clear cache and reload

## Browser Support

| Browser | Desktop        | Mobile         |
| ------- | -------------- | -------------- |
| Chrome  | ✅             | ✅             |
| Edge    | ✅             | ✅             |
| Firefox | ✅             | ✅             |
| Safari  | ✅ (macOS 13+) | ⚠️ (iOS 16.4+) |

## Production Deployment

**Before deploying:**

1. Update `.env`:

   ```env
   NEXT_PUBLIC_BASE_URL=https://your-production-domain.com
   ```

2. Ensure HTTPS is enabled (required for service workers)

3. Test on actual mobile devices

4. Monitor notification_log table for issues

## Next Steps

- [ ] Run the quick setup above
- [ ] Test with real users
- [ ] Customize notification messages
- [ ] Add more notification types (if needed)
- [ ] Monitor notification_log for analytics

## Full Documentation

See `PUSH_NOTIFICATIONS_SETUP.md` for:

- Detailed architecture explanation
- API reference
- Security considerations
- Performance tuning
- Advanced customization

---

**Need Help?** Check:

1. Browser console for errors
2. DevTools → Application → Service Workers
3. Supabase logs for backend errors
4. `notification_log` table for sent notifications
