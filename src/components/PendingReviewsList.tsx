// src/components/PendingReviewsList.tsx - Supervisor Pending Reviews List
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { storage } from '@/utils/storage';
import { useAuth } from '@/hooks/useAuth';
import InspectionPreviewModal from './InspectionPreviewModal';

type InspectionType = 'hse' | 'fire_extinguisher' | 'first_aid' | 'hse_observation' | 'manhours';
type InspectionStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'completed';

interface PendingInspection {
  id: string;
  type: InspectionType;
  title: string;
  inspectedBy: string;
  inspectorId: string;
  location: string;
  inspectionDate: string;
  submittedAt: string;
  status: InspectionStatus;
  criticalIssues?: number;
}

const PendingReviewsList: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [pendingInspections, setPendingInspections] = useState<PendingInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | InspectionType>('all');
  const [previewInspection, setPreviewInspection] = useState<any | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    loadPendingInspections();
  }, []);

  const loadPendingInspections = async () => {
    setLoading(true);
    try {
      const pending: PendingInspection[] = [];

      // Load from database first
      const response = await fetch('/api/inspections?status=pending_review');
      if (response.ok) {
        const result = await response.json();
        const dbInspections = result.inspections || [];

        dbInspections.forEach((inspection: any) => {
          pending.push({
            id: inspection.id,
            type: mapDbTypeToLocal(inspection.inspection_type),
            title: getInspectionTypeName(mapDbTypeToLocal(inspection.inspection_type)),
            inspectedBy: inspection.inspected_by,
            inspectorId: inspection.inspector_id,
            location: inspection.form_data?.location || inspection.form_data?.contractor || 'N/A',
            inspectionDate: inspection.inspection_date || inspection.created_at?.split('T')[0],
            submittedAt: inspection.submitted_at || inspection.created_at,
            status: inspection.status,
            criticalIssues: 0, // Calculate from form_data if needed
          });
        });
      }

      // Also check localStorage for manhours reports only (backward compatibility)
      const manhoursReports = storage.load<any[]>('manhours_reports', []);
      manhoursReports.forEach((report: any) => {
        if (report.status === 'pending_review' && !pending.find((p) => p.id === report.id)) {
          pending.push({
            id: report.id,
            type: 'manhours',
            title: 'Manhours Report',
            inspectedBy: report.preparedBy,
            inspectorId: report.inspectorId,
            location: report.department || 'N/A',
            inspectionDate: report.reportMonth || report.createdAt,
            submittedAt: report.submittedAt || report.createdAt,
            status: report.status,
          });
        }
      });

      // Sort by submitted date (newest first)
      pending.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

      setPendingInspections(pending);
    } catch (error) {
      console.error('Error loading pending inspections:', error);
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

  const getInspectionTypeIcon = (type: InspectionType): string => {
    switch (type) {
      case 'hse':
        return '🛡️';
      case 'fire_extinguisher':
        return '🧯';
      case 'first_aid':
        return '🏥';
      case 'hse_observation':
        return '👁️';
      case 'manhours':
        return '⏰';
      default:
        return '📋';
    }
  };

  const getInspectionTypeColor = (type: InspectionType): string => {
    switch (type) {
      case 'hse':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'fire_extinguisher':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'first_aid':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'hse_observation':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'manhours':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const handleReviewClick = (inspection: PendingInspection) => {
    router.push(`/supervisor/review/${inspection.id}?type=${inspection.type}`);
  };

  const handleViewClick = async (inspection: PendingInspection) => {
    // Load full inspection data
    try {
      const response = await fetch(`/api/inspections/${inspection.id}`);
      if (response.ok) {
        const result = await response.json();
        const dbInspection = result.inspection;

        if (dbInspection) {
          // Map database inspection to local format
          const fullInspection = {
            id: dbInspection.id,
            type: mapDbTypeToLocal(dbInspection.inspection_type),
            status: dbInspection.status,
            inspectedBy: dbInspection.inspected_by,
            inspectorId: dbInspection.inspector_id,
            company: dbInspection.form_data?.contractor || '',
            designation: dbInspection.designation || '',
            inspectionDate: dbInspection.inspection_date || dbInspection.created_at?.split('T')[0],
            date: dbInspection.inspection_date || dbInspection.created_at?.split('T')[0],
            inspector: dbInspection.inspected_by,
            createdAt: dbInspection.created_at,
            submittedAt: dbInspection.submitted_at,
            reviewedAt: dbInspection.reviewed_at,
            reviewedBy: dbInspection.reviewed_by,
            rejectionReason: dbInspection.review_comments,
            reviewComments: dbInspection.review_comments,
            items: dbInspection.form_data?.inspectionItems || dbInspection.form_data?.items || [],
            location: dbInspection.form_data?.location || '',
            signature: dbInspection.signature,
            observations: dbInspection.form_data?.observations || [],
            totalObservations: dbInspection.form_data?.totalObservations || 0,
            extinguishers: dbInspection.form_data?.extinguishers || [],
            kits: dbInspection.form_data?.kits || [],
            kitInspections:
              dbInspection.form_data?.kitInspections || dbInspection.form_data?.kits || [],
            formData: dbInspection.form_data,
          };

          setPreviewInspection(fullInspection);
          setShowPreviewModal(true);
        }
      } else {
        // Fallback to localStorage
        const storageKey = getStorageKey(inspection.type);
        const inspections = storage.load(storageKey, []);
        const found = inspections.find((i: any) => i.id === inspection.id) as any;
        if (found) {
          setPreviewInspection({ ...found, type: inspection.type });
          setShowPreviewModal(true);
        } else {
          alert('Inspection not found');
        }
      }
    } catch (error) {
      console.error('Error loading inspection:', error);
      alert('Error loading inspection details');
    }
  };

  const getStorageKey = (type: InspectionType): string => {
    switch (type) {
      case 'hse':
        return 'inspections';
      case 'fire_extinguisher':
        return 'fire_extinguisher_inspections';
      case 'first_aid':
        return 'first_aid_inspections';
      case 'hse_observation':
        return 'hse_observations';
      case 'manhours':
        return 'manhours_reports';
      default:
        return 'inspections';
    }
  };

  const getFilteredInspections = (): PendingInspection[] => {
    if (filter === 'all') {
      return pendingInspections;
    }
    return pendingInspections.filter((inspection) => inspection.type === filter);
  };

  const filteredInspections = getFilteredInspections();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Pending</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {filteredInspections.length} inspection{filteredInspections.length !== 1 ? 's' : ''}{' '}
              waiting for review
            </p>
          </div>

          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="all">All Types</option>
            <option value="hse">HSE</option>
            <option value="fire_extinguisher">Fire Extinguisher</option>
            <option value="first_aid">First Aid</option>
            <option value="hse_observation">Observations</option>
            <option value="manhours">Manhours</option>
          </select>
        </div>
      </div>

      {/* Inspections List */}
      {filteredInspections.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="mt-3 text-sm text-gray-500">No pending inspections to review</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filteredInspections.map((inspection) => (
              <div
                key={inspection.id}
                onClick={() => handleReviewClick(inspection)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Type Badge */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{getInspectionTypeIcon(inspection.type)}</span>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getInspectionTypeColor(
                          inspection.type,
                        )}`}
                      >
                        {inspection.title}
                      </span>
                    </div>

                    {/* Inspector Info */}
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      Inspected by: {inspection.inspectedBy}
                    </p>

                    {/* Location & Date */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        {inspection.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        {new Date(inspection.inspectionDate).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Submitted Time */}
                    <p className="text-xs text-gray-400 mt-1">
                      Submitted {new Date(inspection.submittedAt).toLocaleString()}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex-shrink-0 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewClick(inspection);
                      }}
                      className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                    >
                      View
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReviewClick(inspection);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Review
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
          onApprove={() => {
            // Reload pending inspections after approval
            loadPendingInspections();
          }}
          onReject={() => {
            // Reload pending inspections after rejection
            loadPendingInspections();
          }}
        />
      )}
    </div>
  );
};

export default PendingReviewsList;
