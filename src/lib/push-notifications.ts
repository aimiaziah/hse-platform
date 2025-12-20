// =====================================================
// PUSH NOTIFICATIONS LIBRARY
// =====================================================
// Client-side utilities for managing push notifications
// =====================================================

/**
 * Check if push notifications are supported
 */
export function isPushNotificationSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Check current notification permission status
 */
export function getNotificationPermissionStatus(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  const permission = await Notification.requestPermission();
  console.log('Notification permission:', permission);
  return permission;
}

/**
 * Convert VAPID public key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(
  vapidPublicKey: string,
): Promise<PushSubscription | null> {
  try {
    if (!isPushNotificationSupported()) {
      throw new Error('Push notifications not supported');
    }

    // Request permission first
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return null;
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('Already subscribed to push notifications');
      return existingSubscription;
    }

    // Subscribe to push notifications
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey,
    });

    console.log('Push notification subscription:', subscription);
    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    throw error;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      console.log('No active subscription to unsubscribe from');
      return false;
    }

    const result = await subscription.unsubscribe();
    console.log('Unsubscribed from push notifications:', result);
    return result;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    throw error;
  }
}

/**
 * Get current push subscription
 */
export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  try {
    if (!isPushNotificationSupported()) {
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch (error) {
    console.error('Error getting push subscription:', error);
    return null;
  }
}

/**
 * Save push subscription to backend
 */
export async function savePushSubscription(subscription: PushSubscription): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
        deviceName: getDeviceName(),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save subscription');
    }

    console.log('Subscription saved to backend');
    return true;
  } catch (error) {
    console.error('Error saving subscription:', error);
    throw error;
  }
}

/**
 * Delete push subscription from backend
 */
export async function deletePushSubscription(endpoint: string): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ endpoint }),
    });

    if (!response.ok) {
      throw new Error('Failed to delete subscription');
    }

    console.log('Subscription deleted from backend');
    return true;
  } catch (error) {
    console.error('Error deleting subscription:', error);
    throw error;
  }
}

/**
 * Get a friendly device name
 */
function getDeviceName(): string {
  const ua = navigator.userAgent;

  if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) {
    if (/iPhone/i.test(ua)) return 'iPhone';
    if (/iPad/i.test(ua)) return 'iPad';
    if (/Android/i.test(ua)) return 'Android Device';
    return 'Mobile Device';
  }

  if (/Mac/i.test(ua)) return 'Mac';
  if (/Win/i.test(ua)) return 'Windows PC';
  if (/Linux/i.test(ua)) return 'Linux PC';

  return 'Web Browser';
}

/**
 * Initialize push notifications
 * Call this when user logs in or app starts
 */
export async function initializePushNotifications(
  vapidPublicKey: string,
  autoSubscribe: boolean = false,
): Promise<void> {
  try {
    if (!isPushNotificationSupported()) {
      console.log('Push notifications not supported on this device');
      return;
    }

    // Check if service worker is registered
    const registration = await navigator.serviceWorker.ready;
    console.log('Service Worker ready:', registration);

    // Check current subscription status
    const existingSubscription = await registration.pushManager.getSubscription();

    if (existingSubscription) {
      // Verify subscription is still valid on backend
      await savePushSubscription(existingSubscription);
      console.log('Push notifications already active');
    } else if (autoSubscribe && Notification.permission === 'granted') {
      // Auto-subscribe if permission already granted
      const subscription = await subscribeToPushNotifications(vapidPublicKey);
      if (subscription) {
        await savePushSubscription(subscription);
        console.log('Auto-subscribed to push notifications');
      }
    }
  } catch (error) {
    console.error('Error initializing push notifications:', error);
  }
}

/**
 * Show a test notification
 */
export async function showTestNotification(): Promise<void> {
  const permission = await requestNotificationPermission();

  if (permission === 'granted') {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification('Test Notification', {
      body: 'Push notifications are working! 🎉',
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      vibrate: [200, 100, 200],
      tag: 'test-notification',
      requireInteraction: false,
    });
  }
}
