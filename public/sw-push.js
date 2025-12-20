// =====================================================
// SERVICE WORKER - PUSH NOTIFICATIONS
// =====================================================
// This file handles push notification events
// It works alongside next-pwa's service worker
// =====================================================

/* eslint-disable no-restricted-globals */

// Listen for push notification events
self.addEventListener('push', function (event) {
  console.log('[Service Worker] Push received:', event);

  let notificationData = {
    title: 'New Notification',
    body: 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    data: {},
  };

  // Parse notification data
  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        image: payload.image,
        tag: payload.tag || 'default',
        requireInteraction: payload.requireInteraction || false,
        data: payload.data || {},
        actions: payload.actions || [],
      };
    } catch (error) {
      console.error('[Service Worker] Error parsing push data:', error);
    }
  }

  const promiseChain = self.registration
    .showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      image: notificationData.image,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      actions: notificationData.actions,
      vibrate: [200, 100, 200], // Vibration pattern
      timestamp: Date.now(),
    })
    .then(() => {
      // Log notification delivery
      return fetch('/api/notifications/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delivered',
          notificationId: notificationData.data.notificationId,
        }),
      }).catch((err) => console.error('Failed to log delivery:', err));
    });

  event.waitUntil(promiseChain);
});

// Handle notification click events
self.addEventListener('notificationclick', function (event) {
  console.log('[Service Worker] Notification clicked:', event);

  event.notification.close();

  const notificationData = event.notification.data || {};
  let urlToOpen = '/';

  // Determine URL based on notification type
  if (notificationData.type === 'inspection_assigned') {
    urlToOpen = `/supervisor/review/${notificationData.inspectionId}`;
  } else if (notificationData.type === 'inspection_approved') {
    urlToOpen = `/inspector/submissions`;
  } else if (notificationData.type === 'inspection_rejected') {
    urlToOpen = `/inspector/submissions`;
  } else if (notificationData.url) {
    urlToOpen = notificationData.url;
  }

  // Handle action button clicks
  if (event.action) {
    switch (event.action) {
      case 'review':
        urlToOpen = `/supervisor/review/${notificationData.inspectionId}`;
        break;
      case 'view':
        urlToOpen = `/inspector/submissions`;
        break;
      case 'dismiss':
        // Just close, don't open anything
        event.waitUntil(
          fetch('/api/notifications/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'dismissed',
              notificationId: notificationData.notificationId,
            }),
          }).catch((err) => console.error('Failed to log dismissal:', err)),
        );
        return;
      default:
        break;
    }
  }

  // Log notification click
  const clickPromise = fetch('/api/notifications/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'clicked',
      notificationId: notificationData.notificationId,
      actionClicked: event.action || 'notification',
    }),
  }).catch((err) => console.error('Failed to log click:', err));

  // Open or focus the app
  const urlPromise = clients
    .matchAll({
      type: 'window',
      includeUncontrolled: true,
    })
    .then(function (clientList) {
      // Check if there's already a window open with this URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        const clientUrl = new URL(client.url);
        const targetUrl = new URL(urlToOpen, self.location.origin);

        if (clientUrl.pathname === targetUrl.pathname && 'focus' in client) {
          return client.focus();
        }
      }

      // If no matching window, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    });

  event.waitUntil(Promise.all([clickPromise, urlPromise]));
});

// Handle notification close events
self.addEventListener('notificationclose', function (event) {
  console.log('[Service Worker] Notification closed:', event);

  const notificationData = event.notification.data || {};

  // Log notification close
  event.waitUntil(
    fetch('/api/notifications/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'closed',
        notificationId: notificationData.notificationId,
      }),
    }).catch((err) => console.error('Failed to log close:', err)),
  );
});

// Handle push subscription change
self.addEventListener('pushsubscriptionchange', function (event) {
  console.log('[Service Worker] Push subscription changed');

  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription.options)
      .then(function (subscription) {
        console.log('[Service Worker] Subscribed after change:', subscription);

        return fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: subscription.toJSON(),
            oldEndpoint: event.oldSubscription.endpoint,
          }),
        });
      })
      .catch((err) => console.error('Failed to resubscribe:', err)),
  );
});

console.log('[Service Worker] Push notification handler loaded');
