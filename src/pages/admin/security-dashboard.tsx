// src/pages/admin/security-dashboard.tsx - DevSecOps Security Monitoring Dashboard
import React, { useState, useEffect } from 'react';
import AdminLayout from '@/roles/admin/layouts/AdminLayout';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api-client';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface SecurityLog {
  id: string;
  event_type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  risk_level: number;
  requires_action: boolean;
  timestamp: string;
  ip_address?: string;
  user_id?: string;
  description: string;
  metadata?: any;
}

interface SecurityStats {
  total: number;
  by_severity: {
    info: number;
    warning: number;
    error: number;
    critical: number;
  };
  by_event_type: Record<string, number>;
  requires_action: number;
  high_risk: number;
  failed_logins: number;
  last_24h: number;
  last_7d: number;
  last_30d: number;
}

interface TimelineData {
  date: string;
  total: number;
  by_severity: {
    info: number;
    warning: number;
    error: number;
    critical: number;
  };
}

const COLORS = {
  critical: '#dc2626', // red-600
  error: '#ea580c', // orange-600
  warning: '#ca8a04', // yellow-600
  info: '#2563eb', // blue-600
};

const SecurityDashboard: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [timeline, setTimeline] = useState<TimelineData[]>([]);
  const [recentEvents, setRecentEvents] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [minRiskLevel, setMinRiskLevel] = useState<number>(0);
  const [showActionRequired, setShowActionRequired] = useState<boolean>(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadDashboardData();
    } else {
      setLoading(false);
      setError('Please log in to view the security dashboard');
    }
  }, [
    dateRange,
    severityFilter,
    eventTypeFilter,
    minRiskLevel,
    showActionRequired,
    isAuthenticated,
    user,
  ]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load stats
      const statsResponse = await apiClient('/api/supabase/security/logs?type=stats');
      if (!statsResponse.ok) {
        const errorData = await statsResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load statistics (${statsResponse.status})`);
      }
      const statsData = await statsResponse.json();
      if (!statsData.success) {
        throw new Error(statsData.error || 'Failed to load statistics');
      }
      setStats(statsData.data);

      // Load timeline
      const days = dateRange === '24h' ? 1 : dateRange === '7d' ? 7 : 30;
      const timelineResponse = await apiClient(
        `/api/supabase/security/logs?type=timeline&days=${days}`,
      );
      if (!timelineResponse.ok) {
        const errorData = await timelineResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load timeline (${timelineResponse.status})`);
      }
      const timelineData = await timelineResponse.json();
      if (!timelineData.success) {
        throw new Error(timelineData.error || 'Failed to load timeline');
      }
      setTimeline(timelineData.data || []);

      // Load recent events
      const params = new URLSearchParams({
        limit: '50',
        offset: '0',
      });
      if (severityFilter !== 'all') params.append('severity', severityFilter);
      if (eventTypeFilter !== 'all') params.append('event_type', eventTypeFilter);
      if (minRiskLevel > 0) params.append('min_risk_level', minRiskLevel.toString());
      if (showActionRequired) params.append('requires_action', 'true');

      // Add date filter
      const endDate = new Date();
      const startDate = new Date();
      if (dateRange === '24h') {
        startDate.setHours(startDate.getHours() - 24);
      } else if (dateRange === '7d') {
        startDate.setDate(startDate.getDate() - 7);
      } else {
        startDate.setDate(startDate.getDate() - 30);
      }
      params.append('start_date', startDate.toISOString());
      params.append('end_date', endDate.toISOString());

      const eventsResponse = await apiClient(`/api/supabase/security/logs?${params.toString()}`);
      if (!eventsResponse.ok) {
        const errorData = await eventsResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load events (${eventsResponse.status})`);
      }
      const eventsData = await eventsResponse.json();
      if (!eventsData.success) {
        throw new Error(eventsData.error || 'Failed to load events');
      }
      setRecentEvents(eventsData.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(errorMessage);
      console.error('Error loading dashboard:', err);

      // If it's an authentication error, provide helpful message
      if (
        errorMessage.includes('Unauthorized') ||
        errorMessage.includes('Invalid or expired token')
      ) {
        setError('Authentication failed. Please try logging out and logging back in.');
      } else if (errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
        setError('Security logs table not found. Please ensure the database schema is up to date.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSeverityColor = (severity: string) => {
    return COLORS[severity as keyof typeof COLORS] || COLORS.info;
  };

  const getRiskColor = (riskLevel: number) => {
    if (riskLevel >= 8) return 'text-red-600 bg-red-50';
    if (riskLevel >= 5) return 'text-orange-600 bg-orange-50';
    if (riskLevel >= 3) return 'text-yellow-600 bg-yellow-50';
    return 'text-blue-600 bg-blue-50';
  };

  // Prepare chart data
  const severityChartData = stats
    ? [
        { name: 'Critical', value: stats.by_severity.critical, color: COLORS.critical },
        { name: 'Error', value: stats.by_severity.error, color: COLORS.error },
        { name: 'Warning', value: stats.by_severity.warning, color: COLORS.warning },
        { name: 'Info', value: stats.by_severity.info, color: COLORS.info },
      ].filter((item) => item.value > 0)
    : [];

  const eventTypeChartData = stats
    ? Object.entries(stats.by_event_type)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
    : [];

  const timelineChartData = timeline.map((item) => ({
    date: formatDate(item.date),
    fullDate: item.date,
    Critical: item.by_severity.critical,
    Error: item.by_severity.error,
    Warning: item.by_severity.warning,
    Info: item.by_severity.info,
    Total: item.total,
  }));

  if (loading) {
    return (
      <ProtectedRoute requiredRole="admin">
        <AdminLayout title="Security Dashboard">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading security dashboard...</p>
            </div>
          </div>
        </AdminLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="admin">
      <AdminLayout title="Security Dashboard">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">DevSecOps Security Dashboard</h1>
              <p className="text-gray-600 mt-1">Monitor runtime security events and threats</p>
            </div>
            <button
              onClick={loadDashboardData}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <span className="material-icons text-base">refresh</span>
              Refresh
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Metrics Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Events</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
                    <p className="text-xs text-gray-500 mt-1">{stats.last_24h} in last 24h</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="material-icons text-blue-600">security</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Critical Alerts</p>
                    <p className="text-3xl font-bold text-red-600 mt-2">
                      {stats.by_severity.critical}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Requires immediate attention</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="material-icons text-red-600">warning</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Failed Logins</p>
                    <p className="text-3xl font-bold text-orange-600 mt-2">{stats.failed_logins}</p>
                    <p className="text-xs text-gray-500 mt-1">Authentication attempts</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="material-icons text-orange-600">lock</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Action Required</p>
                    <p className="text-3xl font-bold text-yellow-600 mt-2">
                      {stats.requires_action}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Events needing review</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="material-icons text-yellow-600">flag</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as '24h' | '7d' | '30d')}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="error">Error</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                <select
                  value={eventTypeFilter}
                  onChange={(e) => setEventTypeFilter(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  {stats &&
                    Object.keys(stats.by_event_type).map((type) => (
                      <option key={type} value={type}>
                        {type.replace(/_/g, ' ')}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Risk Level
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={minRiskLevel}
                  onChange={(e) => setMinRiskLevel(parseInt(e.target.value) || 0)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-end">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showActionRequired}
                    onChange={(e) => setShowActionRequired(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Action Required Only</span>
                </label>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Severity Distribution */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Events by Severity</h3>
              {severityChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={severityChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {severityChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-300 text-gray-500">
                  No data available
                </div>
              )}
            </div>

            {/* Timeline Chart */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Events Over Time</h3>
              {timelineChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timelineChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="Critical"
                      stroke={COLORS.critical}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Error"
                      stroke={COLORS.error}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Warning"
                      stroke={COLORS.warning}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Info"
                      stroke={COLORS.info}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500">
                  No data available
                </div>
              )}
            </div>
          </div>

          {/* Event Types Chart */}
          {eventTypeChartData.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Types</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={eventTypeChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#9ca3af"
                    tick={{ fontSize: 12 }}
                    width={150}
                  />
                  <Tooltip />
                  <Bar dataKey="value" fill={COLORS.info} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Recent Events Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Security Events</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentEvents.length > 0 ? (
                    recentEvents.map((event) => (
                      <tr key={event.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateTime(event.timestamp)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {event.event_type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: `${getSeverityColor(event.severity)}20`,
                              color: getSeverityColor(event.severity),
                            }}
                          >
                            {event.severity.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskColor(
                              event.risk_level,
                            )}`}
                          >
                            {event.risk_level}/10
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {event.ip_address || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate">
                          {event.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {event.requires_action && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Action Required
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        No security events found for the selected filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
};

export default SecurityDashboard;
