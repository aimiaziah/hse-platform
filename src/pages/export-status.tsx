// src/pages/export-status.tsx
import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import ProtectedRoute from '@/components/ProtectedRoute';
import RoleBasedNav from '@/components/RoleBasedNav';
import { useAuth } from '@/hooks/useAuth';
import { storage } from '@/utils/storage';

interface Inspection {
  id: string;
  formType: string;
  inspectorName: string;
  inspectorId: string;
  status: string;
  submittedAt?: string;
  createdAt: string;
  googleDriveExport?: {
    status: 'pending' | 'success' | 'failed';
    fileId?: string;
    exportedAt?: string;
    error?: string;
  };
}

interface ExportStatus {
  inspectionId: string;
  formType: string;
  inspectorName: string;
  submittedAt: string;
  exportStatus: {
    status: 'pending' | 'success' | 'failed';
    fileId?: string;
    exportedAt?: string;
    error?: string;
  };
}

const ExportStatusPage: React.FC = () => {
  const { user, isRole } = useAuth();
  const [exports, setExports] = useState<ExportStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'success' | 'failed'>('all');

  const loadExportStatus = useCallback(() => {
    setLoading(true);
    try {
      const inspections = storage.load<Inspection[]>('inspections', []);

      // Filter by inspector if not admin
      let filtered = inspections;
      if (isRole('inspector')) {
        filtered = inspections.filter((i) => i.inspectorId === user?.id);
      }

      // Only show submitted inspections with export data
      const exportsData = filtered
        .filter((i) => i.status === 'submitted' && i.googleDriveExport)
        .map((i) => ({
          inspectionId: i.id,
          formType: i.formType,
          inspectorName: i.inspectorName,
          submittedAt: i.submittedAt || i.createdAt,
          exportStatus: i.googleDriveExport!,
        }));

      setExports(exportsData);
    } catch (error) {
      // Error loading export status
      if (error instanceof Error) {
        // Handle error appropriately
      }
    } finally {
      setLoading(false);
    }
  }, [isRole, user?.id]);

  useEffect(() => {
    loadExportStatus();
  }, [loadExportStatus]);

  const getFilteredExports = () => {
    if (filter === 'all') return exports;
    return exports.filter((exp) => exp.exportStatus.status === filter);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return '✓';
      case 'failed':
        return '✗';
      case 'pending':
        return '⏳';
      default:
        return '○';
    }
  };

  const handleRetryExport = (inspectionId: string) => {
    // In production, this would trigger re-export
    // eslint-disable-next-line no-console
    console.log(`Retry export for inspection ${inspectionId} - Feature coming soon!`);
    // TODO: Implement retry export functionality
  };

  const handleOpenInDrive = (fileId: string) => {
    window.open(`https://drive.google.com/file/d/${fileId}/view`, '_blank');
  };

  const filteredExports = getFilteredExports();
  const summary = {
    total: exports.length,
    pending: exports.filter((e) => e.exportStatus.status === 'pending').length,
    success: exports.filter((e) => e.exportStatus.status === 'success').length,
    failed: exports.filter((e) => e.exportStatus.status === 'failed').length,
  };

  if (loading) {
    return (
      <ProtectedRoute requiredPermission="canViewGoogleDriveStatus">
        <div className="min-h-screen bg-white">
          <RoleBasedNav />
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading export status...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredPermission="canViewGoogleDriveStatus">
      <Head>
        <title>Google Drive Export Status - HSE Inspection</title>
      </Head>

      <div className="min-h-screen bg-white">
        <RoleBasedNav />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Google Drive Export Status</h1>
            <p className="text-gray-600 mt-1">
              Track the status of your inspection exports to Google Drive
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Exports</p>
                  <p className="text-3xl font-bold text-gray-900">{summary.total}</p>
                </div>
                <span className="text-4xl">📤</span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">{summary.pending}</p>
                </div>
                <span className="text-4xl">⏳</span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Success</p>
                  <p className="text-3xl font-bold text-green-600">{summary.success}</p>
                </div>
                <span className="text-4xl">✅</span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Failed</p>
                  <p className="text-3xl font-bold text-red-600">{summary.failed}</p>
                </div>
                <span className="text-4xl">❌</span>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">Filter by status:</span>
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({summary.total})
              </button>
              <button
                type="button"
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'pending'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending ({summary.pending})
              </button>
              <button
                type="button"
                onClick={() => setFilter('success')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'success'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Success ({summary.success})
              </button>
              <button
                type="button"
                onClick={() => setFilter('failed')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'failed'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Failed ({summary.failed})
              </button>
            </div>
          </div>

          {/* Exports List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {filteredExports.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-2">No exports found</p>
                <p className="text-sm text-gray-500">
                  {filter === 'all'
                    ? 'Submit an inspection to see export status'
                    : `No exports with status: ${filter}`}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Inspection
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Inspector
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredExports.map((exportItem) => (
                      <tr key={exportItem.inspectionId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium text-gray-900 capitalize">
                              {exportItem.formType.replace('-', ' ')}
                            </p>
                            <p className="text-xs text-gray-500">ID: {exportItem.inspectionId}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-gray-900">{exportItem.inspectorName}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-gray-900">
                            {new Date(exportItem.submittedAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(exportItem.submittedAt).toLocaleTimeString()}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                              exportItem.exportStatus.status,
                            )}`}
                          >
                            <span className="mr-1">
                              {getStatusIcon(exportItem.exportStatus.status)}
                            </span>
                            {exportItem.exportStatus.status.toUpperCase()}
                          </span>
                          {exportItem.exportStatus.exportedAt && (
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(exportItem.exportStatus.exportedAt).toLocaleString()}
                            </p>
                          )}
                          {exportItem.exportStatus.error && (
                            <p className="text-xs text-red-600 mt-1">
                              {exportItem.exportStatus.error}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {exportItem.exportStatus.status === 'success' &&
                            exportItem.exportStatus.fileId && (
                              <button
                                type="button"
                                onClick={() => handleOpenInDrive(exportItem.exportStatus.fileId!)}
                                className="text-blue-600 hover:text-blue-800 font-medium mr-3"
                              >
                                View in Drive
                              </button>
                            )}
                          {exportItem.exportStatus.status === 'failed' && (
                            <button
                              type="button"
                              onClick={() => handleRetryExport(exportItem.inspectionId)}
                              className="text-orange-600 hover:text-orange-800 font-medium"
                            >
                              Retry Export
                            </button>
                          )}
                          {exportItem.exportStatus.status === 'pending' && (
                            <span className="text-gray-500">Processing...</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Help Section */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">About Google Drive Export</h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p>
                <strong>Pending:</strong> The export is queued and will be processed shortly.
              </p>
              <p>
                <strong>Success:</strong> The inspection has been successfully exported to Google
                Drive. Click "View in Drive" to open it.
              </p>
              <p>
                <strong>Failed:</strong> The export encountered an error. Click "Retry Export" to
                try again.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default ExportStatusPage;
