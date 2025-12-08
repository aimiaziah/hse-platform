// src/pages/inspector/submissions.tsx - View and Delete All Submissions
/* eslint-disable no-console */
/* eslint-disable no-alert */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import InspectorLayout from '@/roles/inspector/layouts/InspectorLayout';
import { storage } from '@/utils/storage';
import { useAuth } from '@/hooks/useAuth';
import { Trash2, FileText, Calendar } from 'lucide-react';

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

  useEffect(() => {
    loadSubmissions();
  }, [user]);

  const loadSubmissions = () => {
    if (!user) return;

    try {
      const allSubmissions: Submission[] = [];

      // Fire Extinguisher Inspections
      const fireInspections = storage.load<any[]>('fire_extinguisher_inspections', []);
      fireInspections
        .filter((i: any) => i.inspectorId === user.id || i.inspectedBy === user.name)
        .forEach((i: any) => {
          allSubmissions.push({
            id: i.id,
            type: 'fire_extinguisher_inspections',
            formName: 'Fire Extinguisher',
            createdAt: i.createdAt,
            location: i.location,
            status: i.status,
          });
        });

      // First Aid Inspections
      const firstAidInspections = storage.load<any[]>('first_aid_inspections', []);
      firstAidInspections
        .filter((i: any) => i.inspectorId === user.id || i.inspectedBy === user.name)
        .forEach((i: any) => {
          allSubmissions.push({
            id: i.id,
            type: 'first_aid_inspections',
            formName: 'First Aid Items',
            createdAt: i.createdAt,
            location: i.location,
            status: i.status,
          });
        });

      // Manhours Reports
      const manhoursReports = storage.load<any[]>('manhours_reports', []);
      manhoursReports
        .filter((i: any) => i.inspectorId === user.id || i.inspectedBy === user.name)
        .forEach((i: any) => {
          allSubmissions.push({
            id: i.id,
            type: 'manhours_reports',
            formName: 'Monthly Safety & Health Man-hours Report',
            createdAt: i.createdAt,
          });
        });

      // HSE Inspections
      const hseInspections = storage.load<any[]>('hse_inspections', []);
      hseInspections
        .filter((i: any) => i.inspectorId === user.id || i.inspectedBy === user.name)
        .forEach((i: any) => {
          allSubmissions.push({
            id: i.id,
            type: 'hse_inspections',
            formName: 'Health, Safety & Environment (HSE) Inspection',
            createdAt: i.createdAt,
            location: i.location,
            status: i.status,
          });
        });

      // HSE Observations
      const hseObservations = storage.load<any[]>('hse_observations', []);
      hseObservations
        .filter((i: any) => i.inspectorId === user.id || i.inspectedBy === user.name)
        .forEach((i: any) => {
          allSubmissions.push({
            id: i.id,
            type: 'hse_observations',
            formName: 'Observation Form',
            createdAt: i.createdAt,
            location: i.location,
          });
        });

      // Sort by date (newest first)
      allSubmissions.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      setSubmissions(allSubmissions);
    } catch (error) {
      console.error('Error loading submissions:', error);
    }
  };

  const handleDelete = (submission: Submission) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete this ${submission.formName} submission?\n\nThis action cannot be undone.`,
    );
    if (!confirmDelete) return;

    try {
      const inspections = storage.load<any[]>(submission.type, []);
      const filteredInspections = inspections.filter((i: any) => i.id !== submission.id);
      storage.save(submission.type, filteredInspections);
      loadSubmissions();
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
                onClick={() => setFilter('fire_extinguisher_inspections')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  filter === 'fire_extinguisher_inspections'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Fire Extinguisher
              </button>
              <button
                onClick={() => setFilter('first_aid_inspections')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  filter === 'first_aid_inspections'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                First Aid
              </button>
              <button
                onClick={() => setFilter('manhours_reports')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  filter === 'manhours_reports'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Manhours
              </button>
              <button
                onClick={() => setFilter('hse_inspections')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  filter === 'hse_inspections'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                HSE Inspection
              </button>
              <button
                onClick={() => setFilter('hse_observations')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  filter === 'hse_observations'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Observation
              </button>
            </div>
          </div>

          {/* Submissions List */}
          {filteredSubmissions.length === 0 ? (
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
