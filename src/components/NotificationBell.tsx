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
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      initializeNotifications();
      loadHighPriorityAnnouncements();
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

  const loadHighPriorityAnnouncements = async () => {
    try {
      const response = await fetch('/api/announcements?limit=10', {
        credentials: 'include',
      });
      if (response.ok) {
        const { announcements: fetchedAnnouncements } = await response.json();
        // Filter for pinned announcements as high-priority
        const pinnedAnnouncements = fetchedAnnouncements.filter((a: any) => a.is_pinned);
        setAnnouncements(pinnedAnnouncements);
        setUnreadCount(pinnedAnnouncements.length);
      }
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-[#1e3a8a]" strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-sm text-gray-900">High Priority Alerts</h3>
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
              {announcements.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No high priority alerts</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {announcements.map((announcement) => (
                    <div key={announcement.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-base flex-shrink-0">📌</span>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-gray-900 mb-1">
                            {announcement.title}
                          </h4>
                          <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                            {announcement.body}
                          </p>
                          {announcement.published_at && (
                            <p className="text-xs text-gray-400 mt-2">
                              {new Date(announcement.published_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          )}
                        </div>
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded uppercase flex-shrink-0">
                          Priority
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {announcements.length > 0 && (
              <div className="p-3 border-t border-gray-200 bg-gray-50 text-center">
                <p className="text-xs text-gray-500">
                  Showing {announcements.length} pinned announcement
                  {announcements.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
