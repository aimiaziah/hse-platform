// =====================================================
// WEB PUSH UTILITIES (SERVER-SIDE)
// =====================================================
// Server-side utilities for sending push notifications
// Uses the web-push library for Web Push Protocol
// =====================================================

import webpush from 'web-push';

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

interface VAPIDKeys {
  publicKey: string;
  privateKey: string;
  subject: string;
}

/**
 * Initialize web-push with VAPID keys
 */
export function initializeWebPush(vapidKeys: VAPIDKeys): void {
  webpush.setVapidDetails(vapidKeys.subject, vapidKeys.publicKey, vapidKeys.privateKey);
}

/**
 * Get VAPID keys from environment variables
 */
export function getVAPIDKeys(): VAPIDKeys | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@inspection.local';

  if (!publicKey || !privateKey) {
    console.error('VAPID keys not configured. Run: node scripts/generate-vapid-keys.js');
    return null;
  }

  return { publicKey, privateKey, subject };
}

/**
 * Send a push notification to a subscription
 */
export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: NotificationPayload,
  vapidKeys?: VAPIDKeys,
): Promise<{ success: boolean; error?: string; statusCode?: number }> {
  try {
    // Initialize web-push if VAPID keys provided
    if (vapidKeys) {
      initializeWebPush(vapidKeys);
    } else {
      const keys = getVAPIDKeys();
      if (!keys) {
        return { success: false, error: 'VAPID keys not configured' };
      }
      initializeWebPush(keys);
    }

    const payloadString = JSON.stringify(payload);

    // Send the notification
    const result = await webpush.sendNotification(subscription, payloadString);

    console.log('Push notification sent successfully:', result.statusCode);
    return { success: true, statusCode: result.statusCode };
  } catch (error: any) {
    console.error('Error sending push notification:', error);

    // Handle specific error cases
    if (error.statusCode === 410 || error.statusCode === 404) {
      // Subscription expired or not found
      return {
        success: false,
        error: 'Subscription expired or not found',
        statusCode: error.statusCode,
      };
    }

    return {
      success: false,
      error: error.message || 'Unknown error',
      statusCode: error.statusCode,
    };
  }
}

/**
 * Send notifications to multiple subscribers
 */
export async function sendPushNotificationToMultiple(
  subscriptions: PushSubscriptionData[],
  payload: NotificationPayload,
): Promise<{
  successful: number;
  failed: number;
  expired: string[];
  errors: Array<{ endpoint: string; error: string }>;
}> {
  const keys = getVAPIDKeys();
  if (!keys) {
    return {
      successful: 0,
      failed: subscriptions.length,
      expired: [],
      errors: [{ endpoint: 'all', error: 'VAPID keys not configured' }],
    };
  }

  initializeWebPush(keys);

  let successful = 0;
  let failed = 0;
  const expired: string[] = [];
  const errors: Array<{ endpoint: string; error: string }> = [];

  // Send notifications in parallel with a concurrency limit
  const batchSize = 10;
  for (let i = 0; i < subscriptions.length; i += batchSize) {
    const batch = subscriptions.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((sub) => sendPushNotification(sub, payload, keys)),
    );

    results.forEach((result, index) => {
      const subscription = batch[index];

      if (result.status === 'fulfilled' && result.value.success) {
        successful++;
      } else if (result.status === 'fulfilled' && !result.value.success) {
        failed++;
        if (result.value.statusCode === 410 || result.value.statusCode === 404) {
          expired.push(subscription.endpoint);
        } else {
          errors.push({
            endpoint: subscription.endpoint,
            error: result.value.error || 'Unknown error',
          });
        }
      } else if (result.status === 'rejected') {
        failed++;
        errors.push({
          endpoint: subscription.endpoint,
          error: result.reason,
        });
      }
    });
  }

  return { successful, failed, expired, errors };
}

/**
 * Generate VAPID keys (wrapper around web-push library)
 */
export function generateVAPIDKeys(): { publicKey: string; privateKey: string } {
  return webpush.generateVAPIDKeys();
}

/**
 * Validate a push subscription
 */
export function validatePushSubscription(subscription: any): subscription is PushSubscriptionData {
  return (
    subscription &&
    typeof subscription.endpoint === 'string' &&
    subscription.keys &&
    typeof subscription.keys.p256dh === 'string' &&
    typeof subscription.keys.auth === 'string'
  );
}
