// =====================================================
// NOTIFICATION BELL ICON
// =====================================================
// Displays unread notification count and manages subscriptions
// =====================================================

import React, { useState, useEffect } from 'react';
import { Bell, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { initializePushNotifications } from '@/lib/push-notifications';

interface NotificationBellProps {
  onSettingsClick?: () => void;
}

export default function NotificationBell({ onSettingsClick }: NotificationBellProps) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (user) {
      initializeNotifications();
      // loadUnreadCount();
    }
  }, [user]);

  const initializeNotifications = async () => {
    try {
      const response = await fetch('/api/notifications/vapid-public-key');
      if (response.ok) {
        const { publicKey } = await response.json();

        // Auto-initialize if permission already granted
        await initializePushNotifications(publicKey, false);
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  };

  // Placeholder for future implementation
  // const loadUnreadCount = async () => {
  //   try {
  //     const response = await fetch('/api/notifications/unread-count');
  //     if (response.ok) {
  //       const { count } = await response.json();
  //       setUnreadCount(count);
  //     }
  //   } catch (error) {
  //     console.error('Error loading unread count:', error);
  //   }
  // };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              {onSettingsClick && (
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    onSettingsClick();
                  }}
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                  aria-label="Notification settings"
                >
                  <Settings className="w-5 h-5 text-gray-600" />
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {unreadCount === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No new notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {/* Notifications will be loaded here in future implementation */}
                  <p className="p-4 text-sm text-gray-500">Notification history coming soon...</p>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowDropdown(false);
                  onSettingsClick?.();
                }}
                className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Manage notification settings
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
