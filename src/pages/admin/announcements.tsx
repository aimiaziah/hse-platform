// src/pages/admin/announcements.tsx - Announcements Management Page
import React, { useState, useEffect } from 'react';
import AdminLayout from '@/roles/admin/layouts/AdminLayout';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';

interface Announcement {
  id: string;
  title: string;
  body: string;
  is_published: boolean;
  is_pinned: boolean;
  published_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const AnnouncementsManagement: React.FC = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    is_published: false,
    is_pinned: false,
  });

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/announcements', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to load announcements');
      }
      const data = await response.json();
      setAnnouncements(data.announcements || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingAnnouncement(null);
    setFormData({
      title: '',
      body: '',
      is_published: false,
      is_pinned: false,
    });
    setShowModal(true);
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      body: announcement.body,
      is_published: announcement.is_published,
      is_pinned: announcement.is_pinned || false,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.body.trim()) {
      setError('Title and body are required');
      return;
    }

    try {
      const url = editingAnnouncement
        ? `/api/admin/announcements/${editingAnnouncement.id}`
        : '/api/admin/announcements';
      const method = editingAnnouncement ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save announcement');
      }

      await loadAnnouncements();
      setShowModal(false);
      setEditingAnnouncement(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save announcement');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/announcements/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete announcement');
      }

      await loadAnnouncements();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete announcement');
    }
  };

  const handleTogglePublish = async (announcement: Announcement) => {
    try {
      const response = await fetch(`/api/admin/announcements/${announcement.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...announcement,
          is_published: !announcement.is_published,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update announcement');
      }

      await loadAnnouncements();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update announcement');
    }
  };

  const handleTogglePin = async (announcement: Announcement) => {
    try {
      const response = await fetch(`/api/admin/announcements/${announcement.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...announcement,
          is_pinned: !announcement.is_pinned,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update announcement');
      }

      await loadAnnouncements();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update announcement');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="admin">
        <AdminLayout title="Announcements Management">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading announcements...</p>
            </div>
          </div>
        </AdminLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="admin">
      <AdminLayout title="Announcements Management">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Announcements Management</h1>
              <p className="text-gray-600 mt-1">Create and manage announcements for employees</p>
            </div>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create Announcement
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Announcements List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {announcements.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No announcements yet. Create one to get started.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {announcement.title}
                          </h3>
                          {announcement.is_pinned && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-600 text-white uppercase tracking-wide">
                              Pinned
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              announcement.is_published
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {announcement.is_published ? 'Published' : 'Draft'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {announcement.body}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {announcement.published_at && (
                            <span>
                              Published:{' '}
                              {new Date(announcement.published_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                          <span>
                            Created:{' '}
                            {new Date(announcement.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleTogglePin(announcement)}
                          className={`px-3 py-1.5 text-xs font-medium rounded flex items-center gap-1.5 transition-colors ${
                            announcement.is_pinned
                              ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                          title={announcement.is_pinned ? 'Unpin' : 'Pin to top'}
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M10 3a1 1 0 011 1v5h3a1 1 0 110 2h-3v6a1 1 0 11-2 0v-6H6a1 1 0 110-2h3V4a1 1 0 011-1z" />
                          </svg>
                          {announcement.is_pinned ? 'Unpin' : 'Pin'}
                        </button>
                        <button
                          onClick={() => handleTogglePublish(announcement)}
                          className={`px-3 py-1.5 text-xs font-medium rounded ${
                            announcement.is_published
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                        >
                          {announcement.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          onClick={() => handleEdit(announcement)}
                          className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(announcement.id)}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter announcement title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Body <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.body}
                      onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter announcement body text"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_published"
                        checked={formData.is_published}
                        onChange={(e) =>
                          setFormData({ ...formData, is_published: e.target.checked })
                        }
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="is_published" className="ml-2 text-sm text-gray-700">
                        Publish immediately
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_pinned"
                        checked={formData.is_pinned}
                        onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="is_pinned" className="ml-2 text-sm text-gray-700">
                        Pin to top (keeps this announcement at the top)
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setEditingAnnouncement(null);
                      setError(null);
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingAnnouncement ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </ProtectedRoute>
  );
};

export default AnnouncementsManagement;
