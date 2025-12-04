// src/pages/supervisor/reviews.tsx - Supervisor Reviews Page
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import SupervisorLayout from '@/roles/supervisor/layouts/SupervisorLayout';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import InspectionPreviewModal from '@/components/InspectionPreviewModal';
import { storage } from '@/utils/storage';
import { useAuth } from '@/hooks/useAuth';

type InspectionType = 'hse' | 'fire_extinguisher' | 'first_aid' | 'hse_observation' | 'manhours';
type InspectionStatus =
  | 'draft'
  | 'completed'
  | 'pending'
  | 'approved'
  | 'pending_review'
  | 'rejected';

interface ReviewInspection {
  id: string;
  type: InspectionType;
  title: string;
  location: string;
  inspector: string;
  date: string;
  status: InspectionStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComments?: string;
  rejectionReason?: string;
  reviewerSignature?: string;
  createdAt: string;
  submittedAt?: string;
  formData?: any;
  items?: any[];
  extinguishers?: any[];
  kits?: any[];
  kitInspections?: any[];
  observations?: any[];
  signature?: string;
  inspectedBy?: string;
  inspectionDate?: string;
  company?: string;
  designation?: string;
}

interface GroupedInspections {
  [yearMonth: string]: ReviewInspection[];
}

const SupervisorReviews: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [inspections, setInspections] = useState<ReviewInspection[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewInspection, setPreviewInspection] = useState<ReviewInspection | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    loadInspections();
  }, [user]);

  useEffect(() => {
    const years = Array.from(
      new Set(inspections.map((inspection) => new Date(inspection.date).getFullYear().toString())),
    ).sort((a, b) => Number(b) - Number(a));
    setAvailableYears(years);
    if (!selectedYear && years.length > 0) {
      const currentYear = new Date().getFullYear().toString();
      setSelectedYear(years.includes(currentYear) ? currentYear : years[0]);
    }
  }, [inspections]);

  const loadInspections = async () => {
    setLoading(true);
    try {
      const allInspections: ReviewInspection[] = [];
      const response = await fetch('/api/inspections');
      if (response.ok) {
        const result = await response.json();
        const dbInspections = result.inspections || [];
        dbInspections.forEach((inspection: any) => {
          if (['pending_review', 'approved', 'rejected'].includes(inspection.status)) {
            const isObservation =
              inspection.inspection_type === 'hse_general' &&
              inspection.form_data?.isObservation === true;
            const type = isObservation
              ? 'hse_observation'
              : mapDbTypeToLocal(inspection.inspection_type);
            allInspections.push({
              id: inspection.id,
              type: type,
              title: isObservation ? 'HSE Observation' : getInspectionTypeName(type),
              location: inspection.form_data?.location || inspection.form_data?.contractor || 'N/A',
              inspector: inspection.inspected_by,
              date: inspection.inspection_date || inspection.created_at?.split('T')[0],
              status: inspection.status,
              reviewedBy: inspection.reviewed_by,
              reviewedAt: inspection.reviewed_at,
              reviewComments: inspection.review_comments,
              createdAt: inspection.created_at,
              submittedAt: inspection.submitted_at,
            });
          }
        });
      }

      // LocalStorage fallback for manhours reports only
      const manhoursReports = storage.load<any[]>('manhours_reports', []);
      manhoursReports.forEach((report: any) => {
        if (
          ['pending_review', 'approved', 'rejected'].includes(report.status) &&
          !allInspections.find((i) => i.id === report.id)
        ) {
          allInspections.push({
            id: report.id,
            type: 'manhours',
            title: 'Manhours Report',
            location: report.department || 'N/A',
            inspector: report.preparedBy,
            date: report.reportMonth || report.createdAt,
            status: report.status,
            reviewedBy: report.reviewedBy,
            reviewedAt: report.reviewedAt,
            reviewComments: report.reviewComments,
            createdAt: report.createdAt,
            submittedAt: report.submittedAt,
          });
        }
      });

      allInspections.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setInspections(allInspections);
    } catch (error) {
      console.error('Error loading inspections:', error);
    } finally {
      setLoading(false);
    }
  };

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
      case 'manhours':
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

  const getFilteredInspections = (): ReviewInspection[] => {
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
      if (!grouped[yearMonth]) grouped[yearMonth] = [];
      grouped[yearMonth].push(inspection);
    });
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
      case 'pending_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: InspectionStatus): string => {
    switch (status) {
      case 'pending_review':
        return 'Pending Review';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Unknown';
    }
  };

  const handleViewClick = async (inspection: ReviewInspection) => {
    try {
      const response = await fetch(`/api/inspections/${inspection.id}`);
      if (response.ok) {
        const result = await response.json();
        const dbInspection = result.inspection;
        if (dbInspection) {
          const fullInspection: ReviewInspection = {
            ...inspection,
            formData: dbInspection.form_data,
            items: dbInspection.form_data?.inspectionItems || dbInspection.form_data?.items || [],
            extinguishers: dbInspection.form_data?.extinguishers || [],
            kits: dbInspection.form_data?.kits || dbInspection.form_data?.kitInspections || [],
            kitInspections:
              dbInspection.form_data?.kitInspections || dbInspection.form_data?.kits || [],
            observations: dbInspection.form_data?.observations || [],
            signature: dbInspection.signature || dbInspection.form_data?.signature,
            inspectedBy: dbInspection.inspected_by || inspection.inspector,
            inspectionDate: dbInspection.inspection_date || inspection.date,
            company: dbInspection.form_data?.contractor || dbInspection.form_data?.company || '',
            designation: dbInspection.designation || dbInspection.form_data?.designation || '',
            location: dbInspection.form_data?.location || inspection.location || '',
            reviewedBy: dbInspection.reviewed_by || inspection.reviewedBy,
            reviewedAt: dbInspection.reviewed_at || inspection.reviewedAt,
            reviewerSignature:
              dbInspection.form_data?.reviewerSignature || dbInspection.reviewer_signature,
            reviewComments: dbInspection.review_comments || inspection.reviewComments,
            rejectionReason: dbInspection.rejection_reason || dbInspection.review_comments,
            status: dbInspection.status || inspection.status,
          };
          setPreviewInspection(fullInspection);
          setShowPreviewModal(true);
          return;
        }
      }
      // Fallback to localStorage
      // ... (Keep the rest of the fallback logic as-is)
    } catch (error) {
      console.error('Error loading inspection details:', error);
      const basicInspection: ReviewInspection = {
        ...inspection,
        inspectedBy: inspection.inspector,
        inspectionDate: inspection.date,
      };
      setPreviewInspection(basicInspection);
      setShowPreviewModal(true);
    }
  };

  const groupedInspections = groupInspectionsByMonth();
  const sortedMonths = Object.keys(groupedInspections).sort((a, b) => b.localeCompare(a));

  return (
    <ProtectedRoute requiredPermission="canReviewInspections">
      <SupervisorLayout title="Reviews">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-gray-500">Loading reviews...</div>
          </div>
        ) : (
          <div className="space-y-6 pb-6">
            {/* Page Header with Year Filter */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Reviews</h1>
                  <p className="text-xs text-gray-500 mt-0.5">View and manage inspection reviews</p>
                </div>
                <div className="flex-shrink-0">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="mt-4 text-sm text-gray-500">No reviews found</p>
              </div>
            ) : (
              <div className="space-y-6">
                {sortedMonths.map((monthKey) => (
                  <div
                    key={monthKey}
                    className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden"
                  >
                    {/* Month Header */}
                    <div className="border-b border-gray-100 px-6 py-3">
                      <h2 className="text-sm font-medium text-gray-700">
                        {formatMonthYear(monthKey)}
                      </h2>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                          <tr>
                            <th
                              scope="col"
                              className="w-[40%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Inspection Type
                            </th>
                            <th
                              scope="col"
                              className="w-[30%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Status
                            </th>
                            <th
                              scope="col"
                              className="w-[30%] px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {groupedInspections[monthKey].map((inspection) => (
                            <tr key={inspection.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
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
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <span
                                    className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                      inspection.status,
                                    )}`}
                                  >
                                    {getStatusLabel(inspection.status)}
                                  </span>
                                  {inspection.reviewedAt && (
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
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <button
                                  onClick={() => handleViewClick(inspection)}
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Summary Footer */}
            {sortedMonths.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-3 text-center">
                <p className="text-xs text-gray-600">
                  Showing{' '}
                  <span className="font-medium text-gray-900">
                    {getFilteredInspections().length}
                  </span>{' '}
                  review{getFilteredInspections().length !== 1 ? 's' : ''}{' '}
                  {selectedYear ? `in ${selectedYear}` : 'total'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Preview Modal */}
        {previewInspection && (
          <InspectionPreviewModal
            inspection={previewInspection}
            isOpen={showPreviewModal}
            onClose={() => {
              setShowPreviewModal(false);
              setPreviewInspection(null);
            }}
            user={user ? { name: user.name, role: user.role } : undefined}
            onApprove={loadInspections}
            onReject={loadInspections}
          />
        )}
      </SupervisorLayout>
    </ProtectedRoute>
  );
};

export default SupervisorReviews;
