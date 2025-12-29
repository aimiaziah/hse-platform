// src/pages/inspector/submissions.tsx - View and Delete All Submissions
/* eslint-disable no-console */
/* eslint-disable no-alert */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import InspectorLayout from '@/roles/inspector/layouts/InspectorLayout';
import { useAuth } from '@/hooks/useAuth';
import { Trash2, FileText, Calendar, Loader2 } from 'lucide-react';

interface Submission {
  id: string;
  type: string;
  formName: string;
  createdAt: string;
  location?: string;
  status?: string;
}

const InspectorSubmissions: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSubmissions();
  }, [user]);

  const loadSubmissions = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch from Supabase API
      const response = await fetch('/api/inspections?limit=100');
      if (!response.ok) {
        throw new Error('Failed to fetch submissions');
      }

      const data = await response.json();
      const inspections = data.inspections || [];

      // Map inspection types to form names
      const typeMap: Record<string, string> = {
        fire_extinguisher: 'Fire Extinguisher',
        first_aid: 'First Aid Items',
        manhours: 'Monthly Safety & Health Man-hours Report',
        hse_general: 'Health, Safety & Environment (HSE) Inspection',
        hse_observation: 'Observation Form',
      };

      // Transform to submissions format
      const allSubmissions: Submission[] = inspections.map((inspection: any) => ({
        id: inspection.id,
        type: inspection.inspection_type,
        formName: typeMap[inspection.inspection_type] || inspection.inspection_type,
        createdAt: inspection.created_at,
        location: inspection.form_data?.location || null,
        status: inspection.status,
      }));

      setSubmissions(allSubmissions);
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (submission: Submission) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete this ${submission.formName} submission?\n\nThis action cannot be undone.`,
    );
    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/inspections/${submission.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete submission');
      }

      // Reload submissions after successful delete
      await loadSubmissions();
      alert('Submission deleted successfully');
    } catch (error) {
      console.error('Error deleting submission:', error);
      alert('Failed to delete submission. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredSubmissions =
    filter === 'all' ? submissions : submissions.filter((s) => s.type === filter);

  return (
    <ProtectedRoute requiredPermission="canCreateInspections">
      <InspectorLayout title="My Submissions">
        <div className="p-3 space-y-4 max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-800">My Submissions</h1>
              <p className="text-sm text-gray-500 mt-1">
                {filteredSubmissions.length} total submission(s)
              </p>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <p className="text-xs font-semibold text-gray-600 mb-2">Filter by Form Type:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Forms
              </button>
              <button
                onClick={() => setFilter('fire_extinguisher')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  filter === 'fire_extinguisher'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Fire Extinguisher
              </button>
              <button
                onClick={() => setFilter('first_aid')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  filter === 'first_aid'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                First Aid
              </button>
              <button
                onClick={() => setFilter('manhours')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  filter === 'manhours'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Manhours
              </button>
              <button
                onClick={() => setFilter('hse_general')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  filter === 'hse_general'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                HSE Inspection
              </button>
              <button
                onClick={() => setFilter('hse_observation')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  filter === 'hse_observation'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Observation
              </button>
            </div>
          </div>

          {/* Submissions List */}
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <Loader2 className="mx-auto h-12 w-12 text-blue-600 mb-3 animate-spin" />
              <p className="text-gray-500 text-sm">Loading submissions...</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">No submissions found</p>
              <p className="text-gray-400 text-xs mt-1">
                {filter === 'all'
                  ? 'You have not submitted any forms yet'
                  : 'No submissions found for this form type'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSubmissions.map((submission) => (
                <div
                  key={`${submission.type}-${submission.id}`}
                  className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <h3 className="text-sm font-semibold text-gray-800">
                          {submission.formName}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(submission.createdAt)}</span>
                      </div>
                      {submission.location && (
                        <p className="text-xs text-gray-600 mt-1">
                          Location: <span className="font-medium">{submission.location}</span>
                        </p>
                      )}
                      {submission.status && (
                        <p className="text-xs text-gray-600 mt-1">
                          Status:{' '}
                          <span
                            className={`font-medium ${
                              submission.status === 'approved'
                                ? 'text-green-600'
                                : submission.status === 'rejected'
                                ? 'text-red-600'
                                : 'text-yellow-600'
                            }`}
                          >
                            {submission.status}
                          </span>
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(submission)}
                      className="ml-3 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete this submission"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </InspectorLayout>
    </ProtectedRoute>
  );
};

export default InspectorSubmissions;
