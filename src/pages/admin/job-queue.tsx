// src/pages/admin/job-queue.tsx
import React, { useState, useEffect } from 'react';
import AdminLayout from '@/roles/admin/layouts/AdminLayout';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/router';
import { RefreshCw, Play, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

interface JobQueueStatus {
  summary: {
    pending: number;
    retriableFailed: number;
    stuck: number;
  };
  recentJobs: any[];
  stuckJobs: string[];
}

const JobQueuePage: React.FC = () => {
  const { hasPermission } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<JobQueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/jobs/status');
      if (!response.ok) throw new Error('Failed to fetch status');
      const result = await response.json();
      if (result.success) {
        setStatus(result.data);
      }
    } catch (error) {
      console.error('Error fetching job status:', error);
    } finally {
      setLoading(false);
    }
  };

  const processJobs = async () => {
    try {
      setProcessing(true);
      const response = await fetch('/api/jobs/process', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to process jobs');
      const result = await response.json();
      alert(
        `Job processing complete!\n\nProcessed: ${result.result.processed}\nSuccessful: ${result.result.successful}\nFailed: ${result.result.failed}`,
      );
      await fetchStatus();
    } catch (error) {
      console.error('Error processing jobs:', error);
      alert('Failed to process jobs. Check console for details.');
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    if (!hasPermission('canManageSettings')) {
      router.push('/');
      return;
    }
    fetchStatus();
  }, [hasPermission, router]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchStatus();
    }, 30000); // Refresh every 30 seconds (reduced from 10s to save Disk IO)

    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (!hasPermission('canManageSettings')) {
    return null;
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading job queue status...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'processing':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <ProtectedRoute requiredPermission="canManageSettings">
      <AdminLayout>
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">Background Job Queue</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Monitor and manage background jobs like SharePoint exports
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">Auto-refresh (10s)</span>
                  </label>
                  <button
                    onClick={fetchStatus}
                    disabled={loading}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  <button
                    onClick={processJobs}
                    disabled={processing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    {processing ? 'Processing...' : 'Process Jobs Now'}
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pending Jobs</p>
                      <p className="text-3xl font-bold text-yellow-700">
                        {status?.summary.pending || 0}
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-yellow-600" />
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Retriable Failed</p>
                      <p className="text-3xl font-bold text-red-700">
                        {status?.summary.retriableFailed || 0}
                      </p>
                    </div>
                    <XCircle className="w-8 h-8 text-red-600" />
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Stuck Jobs</p>
                      <p className="text-3xl font-bold text-orange-700">
                        {status?.summary.stuck || 0}
                      </p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800 mb-1">
                    Automatic Job Processing
                  </p>
                  <p className="text-sm text-gray-700">
                    Jobs are processed automatically when forms are submitted. You can also manually
                    trigger processing using the &quot;Process Jobs Now&quot; button above.
                  </p>
                  <p className="text-xs text-gray-600 mt-2">
                    💡 Tip: Set up a cron job to call{' '}
                    <code className="bg-white px-2 py-0.5 rounded">POST /api/jobs/process</code>{' '}
                    every 1-5 minutes for automatic background processing.
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Jobs Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">
                  Recent Jobs (Last 24 Hours)
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Job Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Retries
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Started
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completed
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Error
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {status?.recentJobs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                          No recent jobs
                        </td>
                      </tr>
                    ) : (
                      status?.recentJobs.map((job) => (
                        <tr key={job.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {job.job_type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                job.status,
                              )}`}
                            >
                              {getStatusIcon(job.status)}
                              {job.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {job.retry_count} / {job.max_retries}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(job.created_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {job.started_at ? new Date(job.started_at).toLocaleString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {job.completed_at ? new Date(job.completed_at).toLocaleString() : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-red-600">
                            {job.error_message ? (
                              <span className="truncate block max-w-xs" title={job.error_message}>
                                {job.error_message}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
};

export default JobQueuePage;
