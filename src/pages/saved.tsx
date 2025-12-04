import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import InspectorLayout from '@/roles/inspector/layouts/InspectorLayout';
import { storage } from '@/utils/storage';
import { exportInspectionOriginalFormat } from '@/utils/exportOriginalFormat';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api-client';

type InspectionType = 'hse' | 'fire_extinguisher' | 'first_aid' | 'hse_observation' | 'manhours';
type InspectionStatus = 'draft' | 'completed' | 'pending' | 'approved' | 'pending_review';
type SupervisorReviewStatus = 'pending' | 'approved' | 'rejected' | 'not_required' | 'under_review';

interface SavedInspection {
  id: string;
  type: InspectionType;
  title: string;
  location: string;
  inspector: string;
  date: string;
  status: InspectionStatus;
  supervisorReview?: SupervisorReviewStatus;
  supervisorName?: string;
  reviewedAt?: string;
  reviewComments?: string;
  criticalIssues?: number;
  createdAt: string;
  savedAt?: string;
}

interface GroupedInspections {
  [yearMonth: string]: SavedInspection[];
}

const mapDbTypeToLocal = (dbType: string): InspectionType => {
  switch (dbType) {
    case 'hse_general':
      return 'hse';
    case 'fire_extinguisher':
      return 'fire_extinguisher';
    case 'first_aid':
      return 'first_aid';
    case 'hse_observation':
      return 'hse_observation';
    case 'manhours_report':
      return 'manhours';
    default:
      return 'hse';
  }
};

const getInspectionTypeName = (type: InspectionType): string => {
  switch (type) {
    case 'hse':
      return 'HSE Inspection';
    case 'fire_extinguisher':
      return 'Fire Extinguisher';
    case 'first_aid':
      return 'First Aid Items';
    case 'hse_observation':
      return 'HSE Observation';
    case 'manhours':
      return 'Manhours Report';
    default:
      return type;
  }
};

const SavedInspections: React.FC = () => {
  const { user } = useAuth();
  const [inspections, setInspections] = useState<SavedInspection[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInspections();
  }, [user]);

  useEffect(() => {
    // Extract unique years from inspections
    const years = Array.from(
      new Set(inspections.map((inspection) => new Date(inspection.date).getFullYear().toString())),
    ).sort((a, b) => Number(b) - Number(a)); // Sort descending (newest first)

    setAvailableYears(years);

    // Set default to current year if available, otherwise most recent year
    if (!selectedYear && years.length > 0) {
      const currentYear = new Date().getFullYear().toString();
      setSelectedYear(years.includes(currentYear) ? currentYear : years[0]);
    }
  }, [inspections]);

  const loadInspections = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const allInspections: SavedInspection[] = [];

      // Load from database first
      try {
        console.log('[Saved Page] Fetching from database...');
        const response = await apiClient('/api/inspections');
        console.log('[Saved Page] Database response status:', response.status);

        if (response.ok) {
          const result = await response.json();
          const dbInspections = result.inspections || [];

          console.log(`[Saved Page] ✅ Loaded ${dbInspections.length} inspections from database`);

          dbInspections.forEach((inspection: any) => {
            // Check if this is an observation (hse_general with isObservation flag)
            const isObservation =
              inspection.inspection_type === 'hse_general' &&
              inspection.form_data?.isObservation === true;
            const type = isObservation
              ? 'hse_observation'
              : mapDbTypeToLocal(inspection.inspection_type);
            console.log(
              `[Saved Page] DB Inspection: ${type} - ${inspection.id} - Status: ${inspection.status} - isObservation: ${isObservation}`,
            );
            allInspections.push({
              id: inspection.id,
              type,
              title: isObservation ? 'HSE Observation' : getInspectionTypeName(type),
              location:
                inspection.form_data?.location ||
                inspection.form_data?.contractor ||
                inspection.form_data?.department ||
                'N/A',
              inspector: inspection.inspected_by || user.name,
              date: inspection.inspection_date || inspection.created_at?.split('T')[0],
              status: inspection.status || 'completed',
              supervisorReview:
                inspection.status === 'pending_review'
                  ? 'pending'
                  : inspection.status === 'approved'
                  ? 'approved'
                  : 'not_required',
              supervisorName: inspection.reviewed_by,
              reviewedAt: inspection.reviewed_at,
              reviewComments: inspection.review_comments,
              criticalIssues: 0,
              createdAt: inspection.created_at,
              savedAt: inspection.updated_at || inspection.created_at,
            });
          });
        } else {
          console.error(
            '[Saved Page] ❌ Database fetch failed:',
            response.status,
            response.statusText,
          );
          const errorText = await response.text().catch(() => 'Could not read error');
          console.error('[Saved Page] Error details:', errorText);
        }
      } catch (error) {
        console.error('[Saved Page] ❌ Database fetch error:', error);
      }

      // Load Manhours Reports from localStorage (backward compatibility)
      const manhoursReports = storage.load<any[]>('manhours_reports', []);
      manhoursReports.forEach((report: any) => {
        if (
          (report.inspectorId === user.id || report.preparedBy === user.name) &&
          !allInspections.find((i) => i.id === report.id)
        ) {
          allInspections.push({
            id: report.id,
            type: 'manhours',
            title: 'Manhours Report',
            location: report.department || 'N/A',
            inspector: report.preparedBy || user.name,
            date: report.reportMonth || report.createdAt,
            status: report.status || 'completed',
            supervisorReview: report.supervisorReview || 'not_required',
            supervisorName: report.supervisorName,
            reviewedAt: report.reviewedAt,
            reviewComments: report.reviewComments,
            createdAt: report.createdAt,
            savedAt: report.savedAt,
          });
        }
      });

      // Filter out drafts - only show completed, pending_review, approved, and rejected inspections
      const completedInspections = allInspections.filter(
        (inspection) => inspection.status !== 'draft',
      );

      // Sort by creation date (newest first)
      completedInspections.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      console.log(
        `[Saved Page] Total inspections to display: ${completedInspections.length} (filtered out ${
          allInspections.length - completedInspections.length
        } drafts)`,
      );
      completedInspections.forEach((i) => console.log(`  - ${i.type}: ${i.title} (${i.date})`));

      setInspections(completedInspections);
    } catch (error) {
      console.error('Error loading inspections:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateInspectionStats = (items: any[]) => {
    const completed = items.filter((item) => item.rating !== null);
    const compliant = items.filter((item) => ['G', 'A'].includes(item.rating));
    const critical = items.filter((item) => ['SIN', 'SPS', 'SWO'].includes(item.rating));

    return {
      complianceRate:
        completed.length > 0 ? Number(((compliant.length / completed.length) * 100).toFixed(2)) : 0,
      criticalIssues: critical.length,
    };
  };

  const calculateFireExtinguisherStats = (items: any[]) => {
    const completed = items.filter((item) => item.rating !== null);
    const passed = items.filter((item) => item.rating === 'PASS');
    const failed = items.filter((item) => item.rating === 'FAIL');

    return {
      passRate:
        completed.length > 0 ? Number(((passed.length / completed.length) * 100).toFixed(2)) : 0,
      failures: failed.length,
    };
  };

  const calculateFirstAidStats = (items: any[]) => {
    const completed = items.filter((item) => item.status !== null);
    const ready = items.filter((item) => item.status === 'GOOD');
    const critical = items.filter((item) =>
      ['EXPIRED', 'MISSING', 'DAMAGED'].includes(item.status),
    );

    return {
      readinessRate:
        completed.length > 0 ? Number(((ready.length / completed.length) * 100).toFixed(2)) : 0,
      criticalIssues: critical.length,
    };
  };

  const getFilteredInspections = (): SavedInspection[] => {
    if (!selectedYear) return inspections;

    return inspections.filter((inspection) => {
      const inspectionYear = new Date(inspection.date).getFullYear().toString();
      return inspectionYear === selectedYear;
    });
  };

  const groupInspectionsByMonth = (): GroupedInspections => {
    const filtered = getFilteredInspections();
    const grouped: GroupedInspections = {};

    filtered.forEach((inspection) => {
      const date = new Date(inspection.date);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!grouped[yearMonth]) {
        grouped[yearMonth] = [];
      }

      grouped[yearMonth].push(inspection);
    });

    // Sort each group by date (newest first within the month)
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    return grouped;
  };

  const formatMonthYear = (yearMonth: string): string => {
    const [year, month] = yearMonth.split('-');
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getStatusColor = (status: InspectionStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending_review':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: InspectionStatus): string => {
    switch (status) {
      case 'pending_review':
        return 'Pending';
      case 'draft':
        return 'Draft';
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Pending';
      case 'approved':
        return 'Approved';
      default:
        return 'Unknown';
    }
  };

  const groupedInspections = groupInspectionsByMonth();
  const sortedMonths = Object.keys(groupedInspections).sort((a, b) => b.localeCompare(a));

  if (loading) {
    return (
      <ProtectedRoute requiredPermission="canCreateInspections">
        <InspectorLayout title="History Log">
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-gray-600">Loading history...</div>
          </div>
        </InspectorLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredPermission="canCreateInspections">
      <InspectorLayout title="History Log">
        <div className="space-y-3 pb-4">
          {/* Page Header with Year Filter */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-lg font-bold text-gray-900">History</h1>
                <p className="text-xs text-gray-500 mt-0.5">View and download submissions</p>
              </div>

              {/* Year Filter - Analytics Dashboard Style */}
              <div className="flex-shrink-0">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="">All Years</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Content */}
          {sortedMonths.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
              <svg
                className="mx-auto h-10 w-10 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="mt-3 text-xs text-gray-500">No submissions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedMonths.map((monthKey) => (
                <div
                  key={monthKey}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                >
                  {/* Month Header */}
                  <div className="border-b border-gray-200 px-6 py-3">
                    <h2 className="text-sm font-semibold text-gray-700">
                      {formatMonthYear(monthKey)}
                    </h2>
                  </div>

                  {/* Table */}
                  <table className="w-full table-fixed">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="w-[45%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Inspection Type
                        </th>
                        <th className="w-[25%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Status
                        </th>
                        <th className="w-[30%] px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Download
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {groupedInspections[monthKey].map((inspection) => (
                        <tr key={inspection.id} className="hover:bg-gray-50/50 transition-colors">
                          {/* Inspection Type */}
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {inspection.title}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {new Date(inspection.date).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4">
                            <div>
                              <span
                                className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                  inspection.status,
                                )}`}
                              >
                                {getStatusLabel(inspection.status)}
                              </span>
                              {inspection.status === 'approved' && inspection.reviewedAt && (
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {new Date(inspection.reviewedAt).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                  })}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Download */}
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() =>
                                exportInspectionOriginalFormat(inspection.id, inspection.type)
                              }
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors hover:underline"
                            >
                              {inspection.type === 'hse_observation' ? 'PDF' : 'Excel'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {/* Summary Footer */}
          {sortedMonths.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-2 text-center">
              <p className="text-xs text-gray-600">
                Showing{' '}
                <span className="font-semibold text-gray-900">
                  {getFilteredInspections().length}
                </span>{' '}
                submission{getFilteredInspections().length !== 1 ? 's' : ''}{' '}
                {selectedYear ? `in ${selectedYear}` : 'total'}
              </p>
            </div>
          )}
        </div>
      </InspectorLayout>
    </ProtectedRoute>
  );
};

export default SavedInspections;
