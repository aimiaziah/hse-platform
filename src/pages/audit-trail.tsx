import React, { useState, useEffect } from 'react';
import BaseLayout from '@/layouts/BaseLayout';
import { storage } from '@/utils/storage';

interface AuditLogEntry {
  timestamp: string;
  user: string;
  action: string;
  details: string;
  inspectionId?: string;
  inspectionType?: 'hse' | 'fire_extinguisher' | 'first_aid';
  category?: string;
}

interface AuditTrailProps {
  inspectionId?: string;
  inspectionType?: 'hse' | 'fire_extinguisher' | 'first_aid';
}

const AuditTrail: React.FC<AuditTrailProps> = ({ inspectionId, inspectionType }) => {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [inspectionTypeFilter, setInspectionTypeFilter] = useState<string>('');

  useEffect(() => {
    loadAuditData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [auditLogs, userFilter, actionFilter, dateFromFilter, dateToFilter, inspectionTypeFilter]);

  const loadAuditData = () => {
    setLoading(true);

    try {
      let allLogs: AuditLogEntry[] = [];

      // Load HSE inspection logs
      const hseInspections = storage.load('inspections', []);
      hseInspections.forEach((inspection: any) => {
        inspection.auditLog.forEach((log: any) => {
          allLogs.push({
            ...log,
            inspectionId: inspection.id,
            inspectionType: 'hse',
            category: 'HSE Inspection',
          });
        });
      });

      // Load Fire Extinguisher inspection logs
      const fireExtinguisherInspections = storage.load('fire_extinguisher_inspections', []);
      fireExtinguisherInspections.forEach((inspection: any) => {
        inspection.auditLog.forEach((log: any) => {
          allLogs.push({
            ...log,
            inspectionId: inspection.id,
            inspectionType: 'fire_extinguisher',
            category: 'Fire Extinguisher Inspection',
          });
        });
      });

      // Load First Aid inspection logs
      const firstAidInspections = storage.load('first_aid_inspections', []);
      firstAidInspections.forEach((inspection: any) => {
        inspection.auditLog.forEach((log: any) => {
          allLogs.push({
            ...log,
            inspectionId: inspection.id,
            inspectionType: 'first_aid',
            category: 'First Aid Items Inspection',
          });
        });
      });

      // Filter by specific inspection if provided
      if (inspectionId && inspectionType) {
        allLogs = allLogs.filter(
          (log) => log.inspectionId === inspectionId && log.inspectionType === inspectionType,
        );
      }

      // Sort by timestamp (newest first)
      allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setAuditLogs(allLogs);
    } catch (error) {
      console.error('Error loading audit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...auditLogs];

    // User filter
    if (userFilter) {
      filtered = filtered.filter((log) =>
        log.user.toLowerCase().includes(userFilter.toLowerCase()),
      );
    }

    // Action filter
    if (actionFilter) {
      filtered = filtered.filter((log) =>
        log.action.toLowerCase().includes(actionFilter.toLowerCase()),
      );
    }

    // Date range filter
    if (dateFromFilter) {
      const fromDate = new Date(dateFromFilter);
      filtered = filtered.filter((log) => new Date(log.timestamp) >= fromDate);
    }

    if (dateToFilter) {
      const toDate = new Date(dateToFilter);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter((log) => new Date(log.timestamp) <= toDate);
    }

    // Inspection type filter
    if (inspectionTypeFilter) {
      filtered = filtered.filter((log) => log.inspectionType === inspectionTypeFilter);
    }

    setFilteredLogs(filtered);
  };

  const clearFilters = () => {
    setUserFilter('');
    setActionFilter('');
    setDateFromFilter('');
    setDateToFilter('');
    setInspectionTypeFilter('');
  };

  const exportAuditLog = () => {
    const csvContent = generateAuditCSV(filteredLogs);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit-trail-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateAuditCSV = (logs: AuditLogEntry[]): string => {
    let csv = 'AUDIT TRAIL REPORT\n\n';
    csv += `Generated,${new Date().toLocaleString()}\n`;
    csv += `Total Records,${logs.length}\n\n`;

    csv += 'Timestamp,User,Action,Inspection Type,Inspection ID,Details\n';

    logs.forEach((log) => {
      csv += `"${new Date(log.timestamp).toLocaleString()}","${log.user}","${log.action}","${
        log.category || log.inspectionType || ''
      }","${log.inspectionId || ''}","${log.details}"\n`;
    });

    return csv;
  };

  const getActionIcon = (action: string): string => {
    const actionLower = action.toLowerCase();

    if (actionLower.includes('created')) return '📝';
    if (actionLower.includes('submitted')) return '📤';
    if (actionLower.includes('approved')) return '✅';
    if (actionLower.includes('rejected')) return '❌';
    if (actionLower.includes('rating') || actionLower.includes('status')) return '🔄';
    if (actionLower.includes('comment')) return '💬';
    if (actionLower.includes('header') || actionLower.includes('quantity')) return '✏️';
    if (actionLower.includes('cleared')) return '🧹';
    if (actionLower.includes('exported')) return '📊';

    return '📋';
  };

  const getActionColor = (action: string): string => {
    const actionLower = action.toLowerCase();

    if (actionLower.includes('created')) return 'text-blue-600 bg-blue-50';
    if (actionLower.includes('submitted')) return 'text-purple-600 bg-purple-50';
    if (actionLower.includes('approved')) return 'text-green-600 bg-green-50';
    if (actionLower.includes('rejected')) return 'text-red-600 bg-red-50';
    if (actionLower.includes('rating') || actionLower.includes('status'))
      return 'text-orange-600 bg-orange-50';
    if (actionLower.includes('comment')) return 'text-indigo-600 bg-indigo-50';
    if (actionLower.includes('cleared')) return 'text-red-600 bg-red-50';

    return 'text-gray-600 bg-gray-50';
  };

  const getRelativeTime = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;

    return time.toLocaleDateString();
  };

  // Get unique values for filter dropdowns
  const uniqueUsers = Array.from(new Set(auditLogs.map((log) => log.user)));
  const uniqueActions = Array.from(new Set(auditLogs.map((log) => log.action)));
  const uniqueInspectionTypes = Array.from(
    new Set(auditLogs.map((log) => log.inspectionType).filter(Boolean)),
  );

  if (loading) {
    return (
      <BaseLayout title="Audit Trail">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading audit data...</div>
        </div>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout title="Audit Trail">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Audit Trail</h1>
            <p className="text-gray-600">
              {inspectionId
                ? `Activity log for ${inspectionType} inspection ${inspectionId}`
                : 'Complete activity log for all inspections'}
            </p>
          </div>
          <button
            onClick={exportAuditLog}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Export Audit Log
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Activities</p>
                <p className="text-3xl font-bold text-gray-900">{filteredLogs.length}</p>
              </div>
              <span className="text-4xl">📋</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-3xl font-bold text-blue-600">{uniqueUsers.length}</p>
              </div>
              <span className="text-4xl">👥</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Inspection Types</p>
                <p className="text-3xl font-bold text-green-600">{uniqueInspectionTypes.length}</p>
              </div>
              <span className="text-4xl">🔍</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Today's Activities</p>
                <p className="text-3xl font-bold text-purple-600">
                  {
                    filteredLogs.filter(
                      (log) => new Date(log.timestamp).toDateString() === new Date().toDateString(),
                    ).length
                  }
                </p>
              </div>
              <span className="text-4xl">📅</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        {!inspectionId && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Users</option>
                  {uniqueUsers.map((user) => (
                    <option key={user} value={user}>
                      {user}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Actions</option>
                  {uniqueActions.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Inspection Type
                </label>
                <select
                  value={inspectionTypeFilter}
                  onChange={(e) => setInspectionTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="hse">HSE Inspection</option>
                  <option value="fire_extinguisher">Fire Extinguisher</option>
                  <option value="first_aid">First Aid Items</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={dateFromFilter}
                  onChange={(e) => setDateFromFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={dateToFilter}
                  onChange={(e) => setDateToFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Audit Log Entries */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Activity Log ({filteredLogs.length} entries)
            </h3>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No audit entries found.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredLogs.map((log, index) => (
                <div key={index} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start space-x-3">
                    {/* Action Icon */}
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getActionColor(
                        log.action,
                      )}`}
                    >
                      <span className="text-sm">{getActionIcon(log.action)}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900">{log.user}</p>
                          <span className="text-sm text-gray-500">•</span>
                          <p className="text-sm text-gray-500">{log.action.replace('_', ' ')}</p>
                          {log.category && (
                            <>
                              <span className="text-sm text-gray-500">•</span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                {log.category}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          <span title={new Date(log.timestamp).toLocaleString()}>
                            {getRelativeTime(log.timestamp)}
                          </span>
                        </div>
                      </div>

                      <p className="mt-1 text-sm text-gray-600">{log.details}</p>

                      {log.inspectionId && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            ID: {log.inspectionId}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Summary */}
        {filteredLogs.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Most Active Users */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Most Active Users</h4>
                <div className="space-y-2">
                  {Object.entries(
                    filteredLogs.reduce((acc, log) => {
                      acc[log.user] = (acc[log.user] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>),
                  )
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([user, count]) => (
                      <div key={user} className="flex justify-between items-center">
                        <span className="text-sm text-gray-900">{user}</span>
                        <span className="text-sm font-medium text-gray-600">
                          {count} activities
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Most Common Actions */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Most Common Actions</h4>
                <div className="space-y-2">
                  {Object.entries(
                    filteredLogs.reduce((acc, log) => {
                      acc[log.action] = (acc[log.action] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>),
                  )
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([action, count]) => (
                      <div key={action} className="flex justify-between items-center">
                        <span className="text-sm text-gray-900">{action.replace('_', ' ')}</span>
                        <span className="text-sm font-medium text-gray-600">{count} times</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </BaseLayout>
  );
};

export default AuditTrail;
