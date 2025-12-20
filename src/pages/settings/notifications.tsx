// =====================================================
// NOTIFICATION SETTINGS PAGE
// =====================================================
// User-facing page for managing notification preferences
// =====================================================

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { Bell, Clock, Smartphone, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import PushNotificationButton from '@/components/PushNotificationButton';
import { getCurrentPushSubscription } from '@/lib/push-notifications';

interface NotificationPreferences {
  notify_on_assignment: boolean;
  notify_on_approval: boolean;
  notify_on_rejection: boolean;
  notify_on_comments: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

interface PushSubscription {
  id: string;
  device_name: string;
  created_at: string;
  last_used_at: string;
  endpoint: string;
}

export default function NotificationSettings() {
  const { user, hasPermission } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    notify_on_assignment: true,
    notify_on_approval: true,
    notify_on_rejection: true,
    notify_on_comments: true,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
  });
  const [subscriptions, setSubscriptions] = useState<PushSubscription[]>([]);
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadSettings();
  }, [user, router]);

  const loadSettings = async () => {
    try {
      setLoading(true);

      // Load preferences
      const prefResponse = await fetch('/api/notifications/preferences');
      if (prefResponse.ok) {
        const data = await prefResponse.json();
        if (data.preferences) {
          setPreferences(data.preferences);
        }
      }

      // Load subscriptions
      const subsResponse = await fetch('/api/notifications/subscriptions');
      if (subsResponse.ok) {
        const data = await subsResponse.json();
        setSubscriptions(data.subscriptions || []);
      }

      // Get current device's subscription
      const currentSub = await getCurrentPushSubscription();
      if (currentSub) {
        setCurrentEndpoint(currentSub.endpoint);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);

      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      alert('✅ Notification preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('❌ Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubscription = async (subscriptionId: string, endpoint: string) => {
    if (!confirm('Remove this device from receiving notifications?')) {
      return;
    }

    try {
      const response = await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete subscription');
      }

      setSubscriptions(subscriptions.filter((s) => s.id !== subscriptionId));
      alert('Device removed successfully');
    } catch (error) {
      console.error('Error deleting subscription:', error);
      alert('Failed to remove device. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Notification Settings</h1>
          <p className="text-gray-600 mt-2">Manage how and when you receive push notifications</p>
        </div>

        {/* Enable/Disable Notifications */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Push Notifications</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Enable push notifications to receive updates even when your browser is closed.
          </p>
          <PushNotificationButton />
        </div>

        {/* Notification Types */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Notification Types</h2>
          <div className="space-y-4">
            {user?.role === 'supervisor' && (
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences.notify_on_assignment}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      notify_on_assignment: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Inspection Assignments</div>
                  <div className="text-sm text-gray-600">
                    Get notified when inspections are assigned to you for review
                  </div>
                </div>
              </label>
            )}

            {user?.role === 'inspector' && (
              <>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={preferences.notify_on_approval}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        notify_on_approval: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Inspection Approvals</div>
                    <div className="text-sm text-gray-600">
                      Get notified when your inspections are approved
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={preferences.notify_on_rejection}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        notify_on_rejection: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Inspection Rejections</div>
                    <div className="text-sm text-gray-600">
                      Get notified when your inspections need revisions
                    </div>
                  </div>
                </label>
              </>
            )}

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={preferences.notify_on_comments}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    notify_on_comments: e.target.checked,
                  })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-gray-900">Comments</div>
                <div className="text-sm text-gray-600">
                  Get notified when someone comments on your inspections
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Quiet Hours</h2>
          </div>
          <p className="text-gray-600 mb-4">Don't receive notifications during specific hours</p>

          <label className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              checked={preferences.quiet_hours_enabled}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  quiet_hours_enabled: e.target.checked,
                })
              }
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="font-medium text-gray-900">Enable quiet hours</span>
          </label>

          {preferences.quiet_hours_enabled && (
            <div className="flex items-center gap-4 ml-7">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start time</label>
                <input
                  type="time"
                  value={preferences.quiet_hours_start}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      quiet_hours_start: e.target.value,
                    })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End time</label>
                <input
                  type="time"
                  value={preferences.quiet_hours_end}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      quiet_hours_end: e.target.value,
                    })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Connected Devices */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Smartphone className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Connected Devices</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Devices that are currently receiving push notifications
          </p>

          {subscriptions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No devices connected. Enable push notifications to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="font-medium text-gray-900">
                        {sub.device_name}
                        {currentEndpoint === sub.endpoint && (
                          <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            This device
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        Added {new Date(sub.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteSubscription(sub.id, sub.endpoint)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Remove device"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSavePreferences}
            disabled={saving}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Preferences'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
