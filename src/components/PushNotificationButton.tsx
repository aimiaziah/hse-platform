// =====================================================
// PUSH NOTIFICATION SUBSCRIPTION BUTTON
// =====================================================
// Component for enabling/disabling push notifications
// =====================================================

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import {
  isPushNotificationSupported,
  getNotificationPermissionStatus,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getCurrentPushSubscription,
  savePushSubscription,
  deletePushSubscription,
  showTestNotification,
} from '@/lib/push-notifications';

export default function PushNotificationButton() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    const supported = isPushNotificationSupported();
    setIsSupported(supported);

    if (supported) {
      const perm = getNotificationPermissionStatus();
      setPermission(perm);

      const subscription = await getCurrentPushSubscription();
      setIsSubscribed(!!subscription);
    }
  };

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      // Get VAPID public key
      const response = await fetch('/api/notifications/vapid-public-key');
      if (!response.ok) {
        throw new Error('Failed to get VAPID public key');
      }

      const { publicKey } = await response.json();

      // Subscribe to push notifications
      const subscription = await subscribeToPushNotifications(publicKey);

      if (subscription) {
        // Save subscription to backend
        await savePushSubscription(subscription);
        setIsSubscribed(true);
        setPermission('granted');

        // Show test notification
        await showTestNotification();

        alert('✅ Push notifications enabled! You will now receive notifications.');
      } else {
        alert('❌ Failed to enable notifications. Please check your browser settings.');
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      alert(
        `Failed to enable notifications: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    try {
      const subscription = await getCurrentPushSubscription();
      if (subscription) {
        // Delete from backend first
        await deletePushSubscription(subscription.endpoint);

        // Then unsubscribe locally
        await unsubscribeFromPushNotifications();
        setIsSubscribed(false);

        alert('Push notifications disabled.');
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
      alert(
        `Failed to disable notifications: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="text-sm text-gray-500">
        <BellOff className="inline w-4 h-4 mr-1" />
        Push notifications not supported
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isSubscribed ? (
        <button
          onClick={handleUnsubscribe}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <BellOff className="w-4 h-4" />
          )}
          <span>Disable Notifications</span>
        </button>
      ) : (
        <button
          onClick={handleSubscribe}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
          <span>Enable Notifications</span>
        </button>
      )}

      {permission === 'denied' && (
        <div className="text-sm text-red-600">
          Notifications blocked. Please enable in browser settings.
        </div>
      )}
    </div>
  );
}
