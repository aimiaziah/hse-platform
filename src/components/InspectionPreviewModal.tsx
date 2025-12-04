// src/components/InspectionPreviewModal.tsx - Mobile Preview Modal for Supervisor Reviews
import React, { useState, useEffect, useRef } from 'react';
import { exportToGoogleDrive, isGoogleDriveConfigured } from '@/utils/googleDrive';
import { storage } from '@/utils/storage';
import {
  compressSignature,
  compressPhoto,
  compressObservationPhotos,
} from '@/utils/imageCompression';
import SignaturePinVerificationModal from '@/components/SignaturePinVerificationModal';
import { useAuth } from '@/hooks/useAuth';

type InspectionType = 'hse' | 'fire_extinguisher' | 'first_aid' | 'hse_observation' | 'manhours';
type InspectionStatus =
  | 'draft'
  | 'completed'
  | 'pending'
  | 'approved'
  | 'pending_review'
  | 'rejected';

interface Inspection {
  id: string;
  type: InspectionType;
  status: InspectionStatus;
  inspectedBy?: string;
  inspectorId?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComments?: string;
  rejectionReason?: string;
  reviewerSignature?: string;
  company?: string;
  designation?: string;
  inspectionDate?: string;
  location?: string;
  items?: any[];
  extinguishers?: any[];
  kits?: any[];
  kitInspections?: any[];
  observations?: any[];
  formData?: any;
  signature?: string;
  date?: string;
  inspector?: string;
  [key: string]: any;
}

interface InspectionPreviewModalProps {
  inspection: Inspection;
  isOpen: boolean;
  onClose: () => void;
  user?: { name: string; role?: string };
  onApprove?: () => void;
  onReject?: () => void;
}

const InspectionPreviewModal: React.FC<InspectionPreviewModalProps> = ({
  inspection,
  isOpen,
  onClose,
  user,
  onApprove,
  onReject,
}) => {
  const { verifySignaturePin } = useAuth();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showPinVerification, setShowPinVerification] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewComments, setReviewComments] = useState('');
  const [processing, setProcessing] = useState(false);
  const [supervisorSignature, setSupervisorSignature] = useState('');
  const [fullImageUrl, setFullImageUrl] = useState<string | null>(null);

  const getGroupedInspectionData = () => {
    const grouped: { [location: string]: any[] } = {};
    if (inspection.type === 'fire_extinguisher' && inspection.extinguishers) {
      inspection.extinguishers.forEach((item: any) => {
        const location = item.location || 'Unspecified Location';
        if (!grouped[location]) {
          grouped[location] = [];
        }
        grouped[location].push(item);
      });
    } else if (inspection.type === 'first_aid' && (inspection.kits || inspection.kitInspections)) {
      const kits = inspection.kits || inspection.kitInspections || [];
      kits.forEach((kit: any) => {
        const location = kit.location || 'Unspecified Location';
        if (!grouped[location]) {
          grouped[location] = [];
        }
        grouped[location].push(kit);
      });
    } else if (
      inspection.type === 'hse' &&
      (inspection.items || inspection.formData?.inspectionItems)
    ) {
      const items = inspection.items || inspection.formData?.inspectionItems || [];
      const location = inspection.location || 'General Inspection';
      grouped[location] = items;
    } else if (inspection.type === 'hse_observation') {
      const location = inspection.formData?.location || inspection.location || 'Observation';
      grouped[location] = [inspection.formData || inspection];
    } else if (inspection.type === 'manhours') {
      const location = 'Monthly Report';
      grouped[location] = [inspection.formData || inspection];
    }
    return grouped;
  };

  const handlePinVerification = async (pin: string): Promise<boolean> => {
    const result = await verifySignaturePin(pin);
    if (result.success && result.signature) {
      setSupervisorSignature(result.signature);
      return true;
    }
    return false;
  };

  const createNotification = (
    inspectorId: string,
    type: 'approval' | 'rejection',
    message: string,
  ) => {
    const notifications: any[] = storage.load('notifications', []);
    const notification = {
      id: Date.now().toString(),
      userId: inspectorId,
      inspectionId: inspection.id,
      type,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    notifications.push(notification);
    storage.save('notifications', notifications);
  };

  const ensureInspectionInDatabase = async (): Promise<string | null> => {
    try {
      const checkResponse = await fetch(`/api/inspections/${inspection.id}`, {
        credentials: 'include',
      });
      if (checkResponse.ok) {
        return inspection.id;
      }
      if (checkResponse.status === 404) {
        console.log('Inspection not found in database. Creating it now...');
        let formType: string = inspection.type;
        if (inspection.type === 'hse') {
          formType = 'hse_general';
        } else if (inspection.type === 'manhours') {
          formType = 'manhours_report';
        }
        const createResponse = await fetch('/api/inspections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            formType,
            inspectorName: inspection.inspectedBy || inspection.inspector || '',
            data: {
              ...inspection.formData,
              location: inspection.location,
              contractor: inspection.company || inspection.formData?.contractor,
              building: inspection.formData?.building,
              inspectionDate: inspection.inspectionDate || inspection.date,
              inspectedBy: inspection.inspectedBy || inspection.inspector,
              designation: inspection.designation,
              signature: inspection.signature,
              extinguishers: inspection.extinguishers,
              kits: inspection.kits || inspection.kitInspections,
              kitInspections: inspection.kitInspections || inspection.kits,
              items: inspection.items,
              observations: inspection.observations,
            },
            signature: {
              dataUrl: inspection.signature,
              timestamp: inspection.inspectionDate || inspection.date || new Date().toISOString(),
              inspectorId: inspection.inspectorId || inspection.inspectedBy || '',
              inspectorName: inspection.inspectedBy || inspection.inspector || '',
            },
            status: 'pending_review',
          }),
        });
        if (!createResponse.ok) {
          const errorData = await createResponse.json();
          console.error('Failed to create inspection in database:', errorData);
          return null;
        }
        const createResult = await createResponse.json();
        const newInspectionId = createResult.inspection?.id;
        if (!newInspectionId) {
          console.error('No inspection ID returned from database');
          return null;
        }
        console.log(
          `Inspection migrated: localStorage ID ${inspection.id} -> Database UUID ${newInspectionId}`,
        );
        const storageKey = getStorageKey(inspection.type);
        const inspections = storage.load(storageKey, []);
        const updatedInspections = inspections.map((i: Inspection) =>
          i.id === inspection.id ? { ...i, id: newInspectionId } : i,
        );
        storage.save(storageKey, updatedInspections);
        inspection.id = newInspectionId;
        return newInspectionId;
      }
      return null;
    } catch (error) {
      console.error('Error ensuring inspection in database:', error);
      return null;
    }
  };

  const handleApprove = async () => {
    if (!user) {
      alert('User information not available');
      return;
    }
    if (!supervisorSignature) {
      alert('Please add your signature before approving');
      return;
    }
    setProcessing(true);
    try {
      const reviewDate = new Date().toISOString();

      // Compress supervisor signature before using
      console.log('Compressing supervisor signature...');
      const compressedSignature = await compressSignature(supervisorSignature);

      // Compress any observation photos if present
      let compressedFormData = { ...inspection.formData };
      if (inspection.formData?.observations) {
        const { observations } = inspection.formData;
        if (Array.isArray(observations)) {
          const compressedObservations = await Promise.all(
            observations.map(async (obs: any) => {
              if (obs.photos && Array.isArray(obs.photos) && obs.photos.length > 0) {
                const compressedPhotos = await compressObservationPhotos(obs.photos);
                return { ...obs, photos: compressedPhotos };
              }
              return obs;
            }),
          );
          compressedFormData = { ...compressedFormData, observations: compressedObservations };
        }
      }

      // Compress inspector signature if present
      if (inspection.signature) {
        compressedFormData = {
          ...compressedFormData,
          inspectorSignature: await compressSignature(inspection.signature),
        };
      }

      const inspectionId = await ensureInspectionInDatabase();
      if (!inspectionId) {
        throw new Error('Failed to sync inspection to database');
      }
      const apiResponse = await fetch(`/api/inspections/${inspectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: 'approved',
          reviewComments,
          data: {
            ...compressedFormData,
            reviewedBy: user.name,
            reviewedAt: reviewDate,
            reviewerSignature: compressedSignature,
          },
        }),
      });
      if (!apiResponse.ok) {
        throw new Error('Failed to update inspection status in database');
      }
      const storageKey = getStorageKey(inspection.type);
      const inspections = storage.load(storageKey, []);
      if (inspections.length > 0) {
        const updatedInspections = inspections.map((i: Inspection) =>
          i.id === inspection.id
            ? {
                ...i,
                status: 'approved',
                reviewedAt: reviewDate,
                reviewedBy: user.name,
                reviewComments,
                reviewerSignature: compressedSignature,
                formData: compressedFormData,
              }
            : i,
        );
        storage.save(storageKey, updatedInspections);
      }
      // Generate and download Excel file
      try {
        console.log('Generating Excel file for download...');
        const excelBuffer = await generateDocument(
          inspection,
          user.name,
          reviewDate,
          compressedSignature,
          'excel',
        );

        // Create download link and trigger download
        const blob = new Blob([excelBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Generate filename based on inspection type
        const date = new Date().toISOString().split('T')[0];
        const inspectionTypeName = getInspectionTypeName(inspection.type).replace(/\s+/g, '_');
        link.download = `${inspectionTypeName}_Approved_${date}.xlsx`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log('Excel file downloaded successfully!');
      } catch (downloadError) {
        console.error('Error generating Excel for download:', downloadError);
        alert('Warning: Failed to download Excel file, but inspection was still approved.');
      }

      // Export to Google Drive if configured
      try {
        if (!isGoogleDriveConfigured()) {
          console.warn('Google Drive not configured. Skipping document upload.');
        } else {
          // Prepare inspection data with review information (using compressed images)
          const inspectionWithReview = {
            ...inspection,
            formData: compressedFormData,
            signature: compressedFormData.inspectorSignature || inspection.signature,
            reviewedBy: user.name,
            reviewedAt: reviewDate,
            reviewerSignature: compressedSignature,
          };

          // Export to Google Drive (generates Excel internally with compressed images)
          console.log('Step 1/2: Generating Excel with compressed images...');
          console.log('Inspection type:', inspection.type);
          const fileId = await exportToGoogleDrive(inspectionWithReview);
          console.log('Step 2/2: Upload complete!');

          console.log('Document uploaded successfully to Google Drive:', {
            fileId,
            fileUrl: `https://drive.google.com/file/d/${fileId}/view`,
          });
        }
      } catch (exportError) {
        console.error('Document export error:', exportError);
        // Only show alert if it's not a configuration issue
        const errorMsg = exportError instanceof Error ? exportError.message : 'Unknown error';
        if (
          !errorMsg.includes('not enabled') &&
          !errorMsg.includes('not configured') &&
          !errorMsg.includes('Invalid') &&
          !errorMsg.includes('credentials')
        ) {
          alert(
            `Warning: Document upload to Google Drive failed: ${errorMsg}. The inspection was still approved.`,
          );
        } else {
          // Just log configuration errors, don't alert the user
          console.warn('Google Drive upload skipped due to configuration issue:', errorMsg);
        }
      }
      createNotification(
        inspection.inspectorId || inspection.inspectedBy || '',
        'approval',
        `Your ${getInspectionTypeName(inspection.type)} inspection has been approved by ${
          user.name
        }${reviewComments ? `: ${reviewComments}` : ''}`,
      );
      if (isGoogleDriveConfigured()) {
        alert(
          'Inspection approved successfully! Excel file downloaded and exported to Google Drive.',
        );
      } else {
        alert('Inspection approved successfully! Excel file has been downloaded.');
      }
      setShowApproveModal(false);
      if (onApprove) onApprove();
      onClose();
    } catch (error) {
      console.error('Error approving inspection:', error);
      alert('Error approving inspection. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!user) {
      alert('User information not available');
      return;
    }
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    setProcessing(true);
    try {
      const inspectionId = await ensureInspectionInDatabase();
      if (!inspectionId) {
        throw new Error('Failed to sync inspection to database');
      }
      const apiResponse = await fetch(`/api/inspections/${inspectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: 'rejected',
          reviewComments: rejectionReason,
        }),
      });
      if (!apiResponse.ok) {
        throw new Error('Failed to update inspection status in database');
      }
      const storageKey = getStorageKey(inspection.type);
      const inspections = storage.load(storageKey, []);
      if (inspections.length > 0) {
        const updatedInspections = inspections.map((i: Inspection) =>
          i.id === inspection.id
            ? {
                ...i,
                status: 'rejected',
                reviewedAt: new Date().toISOString(),
                reviewedBy: user.name,
                rejectionReason,
                reviewComments: rejectionReason,
              }
            : i,
        );
        storage.save(storageKey, updatedInspections);
      }
      createNotification(
        inspection.inspectorId || inspection.inspectedBy || '',
        'rejection',
        `Your ${getInspectionTypeName(inspection.type)} inspection has been rejected by ${
          user.name
        }. Reason: ${rejectionReason}`,
      );
      alert('Inspection rejected. Inspector has been notified to revise and resubmit.');
      setShowRejectModal(false);
      if (onReject) onReject();
      onClose();
    } catch (error) {
      console.error('Error rejecting inspection:', error);
      alert('Error rejecting inspection. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReExport = async () => {
    setProcessing(true);
    try {
      // For already approved inspections, use existing review data
      const reviewerName = inspection.reviewedBy || user?.name || 'Supervisor';
      const reviewDate = inspection.reviewedAt || new Date().toISOString();
      const reviewerSig = inspection.reviewerSignature || '';

      console.log('Re-exporting approved inspection...');

      // Generate and download Excel file
      const excelBuffer = await generateDocument(
        inspection,
        reviewerName,
        reviewDate,
        reviewerSig,
        'excel',
      );

      // Create download link and trigger download
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Generate filename based on inspection type
      const date = new Date().toISOString().split('T')[0];
      const inspectionTypeName = getInspectionTypeName(inspection.type).replace(/\s+/g, '_');
      link.download = `${inspectionTypeName}_Approved_${date}.xlsx`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('Excel file re-exported successfully!');

      // Optionally export to Google Drive
      try {
        if (isGoogleDriveConfigured()) {
          console.log('Uploading to Google Drive...');
          const fileId = await exportToGoogleDrive(inspection);
          console.log('Upload complete! File ID:', fileId);
          alert('Excel file downloaded and uploaded to Google Drive successfully!');
        } else {
          alert('Excel file downloaded successfully!');
        }
      } catch (driveError) {
        console.error('Google Drive upload failed:', driveError);
        alert('Excel file downloaded successfully! (Google Drive upload failed)');
      }
    } catch (error) {
      console.error('Error re-exporting inspection:', error);
      alert('Error exporting file. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const generateApprovedDocuments = async (
    inspection: Inspection,
    supervisorName: string,
    reviewDate: string,
    signature: string,
  ): Promise<{ excelBuffer: ArrayBuffer; pdfBuffer: ArrayBuffer | null }> => {
    // Generate Excel first (required)
    const excelBuffer = await generateDocument(
      inspection,
      supervisorName,
      reviewDate,
      signature,
      'excel',
    );

    // Try to generate PDF, but don't fail if it errors
    let pdfBuffer: ArrayBuffer | null = null;
    try {
      pdfBuffer = await generateDocument(inspection, supervisorName, reviewDate, signature, 'pdf');
    } catch (pdfError) {
      console.warn('PDF generation failed, continuing with Excel only:', pdfError);
      // PDF generation failed, but we'll continue with just Excel
    }

    return { excelBuffer, pdfBuffer };
  };

  const generateDocument = async (
    inspection: Inspection,
    supervisorName: string,
    reviewDate: string,
    signature: string,
    format: 'excel' | 'pdf',
  ): Promise<ArrayBuffer> => {
    let apiEndpoint = '';
    let requestBody: any = {};
    const inspDate = inspection.inspectionDate || inspection.date || '';
    if (inspection.type === 'fire_extinguisher') {
      apiEndpoint = '/api/export/fire-extinguisher-template';
      requestBody = {
        inspectedBy: inspection.inspectedBy || inspection.inspector,
        inspectionDate: inspDate,
        designation: inspection.designation,
        signature: inspection.signature,
        extinguishers: inspection.extinguishers || [],
        reviewedBy: supervisorName,
        reviewedAt: reviewDate,
        reviewerSignature: signature,
        format,
      };
    } else if (inspection.type === 'first_aid') {
      apiEndpoint = '/api/export/first-aid-template';
      requestBody = {
        inspectedBy: inspection.inspectedBy || inspection.inspector,
        inspectionDate: inspDate,
        designation: inspection.designation,
        signature: inspection.signature,
        kits: inspection.kitInspections || inspection.kits || [],
        reviewedBy: supervisorName,
        reviewedAt: reviewDate,
        reviewerSignature: signature,
        format,
      };
    } else if (inspection.type === 'hse') {
      apiEndpoint = '/api/export/hse-inspection-template';
      requestBody = {
        contractor: inspection.company || inspection.formData?.contractor || '',
        location: inspection.location || inspection.formData?.location || '',
        date: inspDate,
        inspectedBy: inspection.inspectedBy || inspection.inspector,
        workActivity: inspection.formData?.workActivity || '',
        tablePersons: inspection.formData?.tablePersons || [],
        inspectionItems: inspection.items || inspection.formData?.inspectionItems || [],
        commentsRemarks: inspection.formData?.commentsRemarks || '',
        observations: inspection.observations || inspection.formData?.observations || [],
        reviewedBy: supervisorName,
        reviewedAt: reviewDate,
        reviewerSignature: signature,
        format,
      };
    } else if (inspection.type === 'hse_observation') {
      apiEndpoint = '/api/export/hse-observation-template';
      const obs = inspection.formData || inspection;
      requestBody = {
        observation: obs.observation || '',
        location: obs.location || inspection.location || '',
        observedBy: inspection.inspectedBy || inspection.inspector || '',
        observedDate: inspDate,
        actionNeeded: obs.actionNeeded || '',
        hazards: obs.hazards || '',
        remarks: obs.remarks || '',
        status: obs.status || 'Open',
        photos: obs.photos || [],
        itemNo: obs.itemNo || '1',
        categoryName: obs.categoryName || 'General',
        itemName: obs.itemName || 'Observation',
        reviewedBy: supervisorName,
        reviewedAt: reviewDate,
        reviewerSignature: signature,
        format,
      };
    } else if (inspection.type === 'manhours') {
      apiEndpoint = '/api/export/manhours-template';
      const report = inspection.formData || inspection;
      requestBody = {
        preparedBy: inspection.inspectedBy || inspection.inspector || '',
        preparedDate: inspDate,
        reviewedBy: supervisorName,
        reviewedAt: reviewDate,
        reportMonth: report.reportMonth || '',
        reportYear: report.reportYear || new Date().getFullYear().toString(),
        numEmployees: report.numEmployees || '0',
        monthlyManHours: report.monthlyManHours || '0',
        yearToDateManHours: report.yearToDateManHours || '0',
        totalAccumulatedManHours: report.totalAccumulatedManHours || '0',
        annualTotalManHours: report.annualTotalManHours || '0',
        workdaysLost: report.workdaysLost || '0',
        ltiCases: report.ltiCases || '0',
        noLTICases: report.noLTICases || '0',
        nearMissAccidents: report.nearMissAccidents || '0',
        dangerousOccurrences: report.dangerousOccurrences || '0',
        occupationalDiseases: report.occupationalDiseases || '0',
        formulaLtiCases: report.formulaLtiCases || '0',
        formulaAnnualAvgEmployees: report.formulaAnnualAvgEmployees || '0',
        formulaAnnualTotalManHours: report.formulaAnnualTotalManHours || '0',
        formulaWorkdaysLost: report.formulaWorkdaysLost || '0',
        projectName: report.projectName || '',
        monthlyData: report.monthlyData || [],
        remarks: report.remarks || '',
        reviewerSignature: signature,
        format,
      };
    }
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
      // Try to get detailed error message from server
      let errorMessage = `Failed to generate ${format.toUpperCase()}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
        console.error('Server error details:', errorData);
      } catch (e) {
        // If response is not JSON, use generic message
        console.error('Failed to parse error response');
      }
      throw new Error(errorMessage);
    }
    const arrayBuffer = await response.arrayBuffer();
    return arrayBuffer;
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black bg-opacity-50">
      {/* Header - Clean minimal design */}
      <div className="bg-white px-4 py-3 border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-end">
          <button
            onClick={onClose}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>

      {/* Content Area (updated) */}
      <div className="h-[calc(100vh-120px)] overflow-auto bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Inspection Info Card (updated) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {getInspectionTypeName(inspection.type)}
              </h2>
              <span
                className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(
                  inspection.status,
                )}`}
              >
                {getStatusLabel(inspection.status)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs mb-1">Inspector</p>
                <p className="font-medium text-gray-900">
                  {inspection.inspectedBy || inspection.inspector || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Date</p>
                <p className="font-medium text-gray-900">
                  {new Date(
                    inspection.inspectionDate || inspection.date || '',
                  ).toLocaleDateString()}
                </p>
              </div>
              {inspection.location && (
                <div className="col-span-2">
                  <p className="text-gray-500 text-xs mb-1">Location</p>
                  <p className="font-medium text-gray-900">{inspection.location}</p>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Inspection Data by Location/Level (updated) */}
          {(() => {
            const groupedData = getGroupedInspectionData();
            const locations = Object.keys(groupedData).sort((a, b) => {
              const floorOrder: { [key: string]: number } = {
                'ground floor': 1,
                'level 1': 2,
                'first floor': 2,
                'level 2': 3,
                'second floor': 3,
                'level 3': 4,
                'third floor': 4,
              };
              const aOrder = floorOrder[a.toLowerCase()] || 999;
              const bOrder = floorOrder[b.toLowerCase()] || 999;
              return aOrder - bOrder;
            });
            return locations.length > 0 ? (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                  Inspection Details
                </h3>
                {locations.map((location) => {
                  const items = groupedData[location];
                  const sortedItems = [...items].sort((a, b) => (a.no || 0) - (b.no || 0));
                  return (
                    <div
                      key={location}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                    >
                      {/* Location Header - Simplified */}
                      <div className="bg-blue-600 px-5 py-3 border-b border-blue-700">
                        <div className="flex items-center justify-between">
                          <h4 className="text-white font-semibold text-base">{location}</h4>
                          <span className="bg-white text-blue-700 px-2.5 py-0.5 rounded-md text-xs font-medium">
                            {sortedItems.length} {sortedItems.length === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                      </div>
                      <div className="divide-y divide-gray-200">
                        {inspection.type === 'fire_extinguisher' &&
                          sortedItems.map((item: any, idx: number) => (
                            <div key={idx} className="p-5 hover:bg-gray-50 transition-colors">
                              {/* Item Header (updated) */}
                              <div className="flex items-center gap-3 mb-4">
                                <span className="flex-shrink-0 bg-blue-600 text-white font-bold px-3 py-1.5 rounded-md text-sm">
                                  #{item.no || idx + 1}
                                </span>
                                <div className="flex-1">
                                  <p className="font-bold text-gray-900 text-sm">
                                    {item.serialNo || 'N/A'}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    Type/Size: {item.typeSize || item.type || 'N/A'} kg
                                  </p>
                                </div>
                              </div>
                              {/* Basic Info Grid (updated) */}
                              <div className="grid grid-cols-2 gap-4 mb-4 bg-gray-50 rounded-lg p-4">
                                <div>
                                  <span className="text-xs text-gray-600 block mb-1">
                                    Expiry Date:
                                  </span>
                                  <p className="font-semibold text-sm text-gray-900">
                                    {item.expiryDate || 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-600 block mb-1">
                                    Capacity:
                                  </span>
                                  <p className="font-semibold text-sm text-gray-900">
                                    {item.capacity || item.typeSize || 'N/A'} kg
                                  </p>
                                </div>
                              </div>
                              {/* Inspection Checklist Table (updated) */}
                              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-4">
                                <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                                  <p className="text-xs font-bold text-gray-700">
                                    Inspection Checklist
                                  </p>
                                </div>
                                <div className="divide-y divide-gray-200">
                                  {[
                                    { key: 'shell', label: 'Shell' },
                                    { key: 'hose', label: 'Hose' },
                                    { key: 'nozzle', label: 'Nozzle' },
                                    { key: 'pressureGauge', label: 'Pressure Gauge' },
                                    { key: 'safetyPin', label: 'Safety Pin' },
                                    { key: 'pinSeal', label: 'Pin Seal' },
                                    { key: 'accessible', label: 'Accessible' },
                                    { key: 'missingNotInPlace', label: 'Missing / Not in Place' },
                                    { key: 'emptyPressureLow', label: 'Empty / Pressure Low' },
                                    { key: 'servicingTags', label: 'Servicing / Tags' },
                                  ].map(({ key, label }) => (
                                    <div
                                      key={key}
                                      className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                                    >
                                      <span className="text-xs text-gray-700 font-medium">
                                        {label}
                                      </span>
                                      <span
                                        className={`font-bold text-sm px-3 py-1 rounded ${
                                          item[key] === '√' || item[key] === 'PASS'
                                            ? 'bg-green-100 text-green-700'
                                            : item[key] === 'X' || item[key] === 'FAIL'
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-gray-100 text-gray-500'
                                        }`}
                                      >
                                        {String(item[key] || 'NA')}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              {/* AI Captured Images Section */}
                              {item.aiCapturedImages && item.aiCapturedImages.length > 0 && (
                                <div className="mt-4">
                                  <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <svg
                                      className="w-4 h-4 text-purple-600"
                                      viewBox="0 0 24 24"
                                      fill="currentColor"
                                    >
                                      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 22.5l-.394-1.933a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                                    </svg>
                                    AI Scan Images ({item.aiCapturedImages.length})
                                  </p>
                                  <div className="grid grid-cols-2 gap-2">
                                    {item.aiCapturedImages.map((image: any, imgIdx: number) => (
                                      <div key={imgIdx} className="relative">
                                        <img
                                          src={image.dataUrl}
                                          alt={`AI scan ${image.stepId}`}
                                          className="w-full h-40 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                          onClick={() => setFullImageUrl(image.dataUrl)}
                                        />
                                        <div className="absolute bottom-2 left-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded">
                                          {image.stepId.replace(/_/g, ' ')}
                                        </div>
                                        {image.timestamp && (
                                          <div className="absolute top-2 right-2 bg-purple-600/90 text-white text-[10px] px-2 py-1 rounded flex items-center gap-1">
                                            <svg
                                              className="w-3 h-3"
                                              fill="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                                            </svg>
                                            AI
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {item.remarks && (
                                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                                  <p className="text-xs font-bold text-yellow-900 mb-1">
                                    ⚠️ Remarks:
                                  </p>
                                  <p className="text-xs text-yellow-800">{item.remarks}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        {inspection.type === 'first_aid' &&
                          sortedItems.map((kit: any, idx: number) => (
                            <div key={idx} className="p-5 hover:bg-gray-50 transition-colors">
                              {/* Kit Header (updated) */}
                              <div className="flex items-center gap-3 mb-4">
                                <span className="flex-shrink-0 bg-blue-600 text-white font-bold px-3 py-1.5 rounded-md text-sm">
                                  Kit #{kit.no || idx + 1}
                                </span>
                                <div className="flex-1">
                                  <p className="font-bold text-gray-900 text-sm">
                                    {kit.model || 'N/A'}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    Model: {kit.modelNo || 'N/A'}
                                  </p>
                                </div>
                              </div>
                              {/* Kit Items Table (updated) */}
                              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                                  <p className="text-xs font-bold text-gray-700">
                                    First Aid Items ({kit.items?.length || 0} items)
                                  </p>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                      <tr>
                                        <th className="px-4 py-2 text-left text-gray-700 font-semibold">
                                          #
                                        </th>
                                        <th className="px-4 py-2 text-left text-gray-700 font-semibold">
                                          Item Name
                                        </th>
                                        <th className="px-4 py-2 text-center text-gray-700 font-semibold">
                                          Qty
                                        </th>
                                        <th className="px-4 py-2 text-center text-gray-700 font-semibold">
                                          Expiry Date
                                        </th>
                                        <th className="px-4 py-2 text-center text-gray-700 font-semibold">
                                          Status
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                      {kit.items?.map((item: any, itemIdx: number) => (
                                        <tr key={itemIdx} className="hover:bg-gray-50">
                                          <td className="px-4 py-2 text-gray-600 font-medium">
                                            {itemIdx + 1}
                                          </td>
                                          <td className="px-4 py-2 text-gray-900">
                                            {item.name || item.itemName || 'N/A'}
                                          </td>
                                          <td className="px-4 py-2 text-center text-gray-900">
                                            {item.quantity || '-'}
                                          </td>
                                          <td className="px-4 py-2 text-center text-gray-900 text-xs">
                                            {item.expiryDateOption === 'NA'
                                              ? 'N/A'
                                              : item.expiryDate || '-'}
                                          </td>
                                          <td className="px-4 py-2 text-center">
                                            <span
                                              className={`inline-block px-2 py-1 rounded font-bold text-xs ${
                                                item.status === '✓' || item.status === 'GOOD'
                                                  ? 'bg-green-100 text-green-700'
                                                  : item.status === 'X' ||
                                                    ['EXPIRED', 'MISSING', 'DAMAGED'].includes(
                                                      item.status,
                                                    )
                                                  ? 'bg-red-100 text-red-700'
                                                  : 'bg-gray-100 text-gray-500'
                                              }`}
                                            >
                                              {item.status || 'NA'}
                                            </span>
                                          </td>
                                        </tr>
                                      )) || []}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                              {kit.remarks && (
                                <div className="mt-3 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                                  <p className="text-xs font-bold text-yellow-900 mb-1">
                                    ⚠️ Remarks:
                                  </p>
                                  <p className="text-xs text-yellow-800">{kit.remarks}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        {inspection.type === 'hse' &&
                          sortedItems.map((item: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-5 hover:bg-gray-50 transition-colors border-b border-gray-200 last:border-0"
                            >
                              <div className="flex items-start gap-3">
                                <span className="flex-shrink-0 bg-blue-600 text-white font-bold px-2 py-1 rounded text-xs">
                                  {idx + 1}
                                </span>
                                <div className="flex-1">
                                  <p className="font-bold text-gray-900 text-sm mb-1">
                                    {item.item || item.itemName || item.category || 'N/A'}
                                  </p>
                                  {item.category && item.item && (
                                    <p className="text-xs text-gray-600 mb-2">
                                      Category: {item.category}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-gray-600">Rating:</span>
                                    <span
                                      className={`inline-block px-3 py-1 rounded font-bold text-sm ${
                                        item.rating === 'G' || item.rating === 'GOOD'
                                          ? 'bg-green-100 text-green-700'
                                          : ['SIN', 'SPS', 'SWO', 'X', 'FAIL'].includes(item.rating)
                                          ? 'bg-red-100 text-red-700'
                                          : item.rating === 'A'
                                          ? 'bg-blue-200 text-blue-800'
                                          : item.rating === 'P'
                                          ? 'bg-yellow-100 text-yellow-700'
                                          : 'bg-gray-100 text-gray-500'
                                      }`}
                                    >
                                      {item.rating || 'N/A'}
                                    </span>
                                  </div>
                                  {item.remarks && (
                                    <div className="mt-2 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                                      <p className="text-xs font-bold text-yellow-900">
                                        ⚠️ Remarks:
                                      </p>
                                      <p className="text-xs text-yellow-800">{item.remarks}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        {inspection.type === 'hse_observation' &&
                          sortedItems.map((obs: any, idx: number) => (
                            <div key={idx} className="p-5 space-y-4">
                              {/* Photos Section (updated) */}
                              {obs.photos && obs.photos.length > 0 && (
                                <div className="mb-4">
                                  <p className="text-xs font-bold text-gray-700 mb-2">
                                    Photos ({obs.photos.length})
                                  </p>
                                  <div className="grid grid-cols-2 gap-2">
                                    {obs.photos.map((photo: string, photoIdx: number) => (
                                      <img
                                        key={photoIdx}
                                        src={photo}
                                        alt={`Observation photo ${photoIdx + 1}`}
                                        className="w-full h-40 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => setFullImageUrl(photo)}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                              {/* Observation Details (updated) */}
                              <div className="space-y-4">
                                <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
                                  <p className="text-xs font-bold text-blue-900 mb-2">
                                    Observation:
                                  </p>
                                  <p className="text-sm text-gray-800">
                                    {obs.observation || 'N/A'}
                                  </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="text-xs text-gray-600 mb-1">Location:</p>
                                    <p className="font-medium text-gray-900">
                                      {obs.location || 'N/A'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600 mb-1">Date:</p>
                                    <p className="font-medium text-gray-900">{obs.date || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600 mb-1">Time:</p>
                                    <p className="font-medium text-gray-900">{obs.time || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600 mb-1">Status:</p>
                                    <p className="font-medium text-gray-900">
                                      {obs.status || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                                {obs.actionNeeded && (
                                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <p className="text-xs font-bold text-yellow-900 mb-2">
                                      Action Needed:
                                    </p>
                                    <p className="text-sm text-gray-800">{obs.actionNeeded}</p>
                                  </div>
                                )}
                                {obs.hazards && (
                                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="text-xs font-bold text-red-900 mb-2">
                                      Hazards Identified:
                                    </p>
                                    <p className="text-sm text-gray-800">{obs.hazards}</p>
                                  </div>
                                )}
                                {obs.remarks && (
                                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                    <p className="text-xs font-bold text-gray-900 mb-2">Remarks:</p>
                                    <p className="text-sm text-gray-800">{obs.remarks}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        {inspection.type === 'manhours' &&
                          sortedItems.map((report: any, idx: number) => (
                            <div key={idx} className="p-5 space-y-6">
                              {/* Report Header (updated) */}
                              <div className="bg-blue-100 border border-blue-300 rounded-lg p-5 mb-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="text-xs text-blue-700 font-semibold mb-1">
                                      Report Period:
                                    </p>
                                    <p className="font-bold text-blue-900">
                                      {report.reportMonth} {report.reportYear}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-blue-700 font-semibold mb-1">
                                      Prepared By:
                                    </p>
                                    <p className="font-medium text-gray-900">
                                      {report.preparedBy || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              {/* Statistics Section (updated) */}
                              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                                  <p className="text-xs font-bold text-gray-700">
                                    Safety Statistics
                                  </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 p-5 text-sm">
                                  <div>
                                    <p className="text-xs text-gray-600 mb-1">No. of Employees:</p>
                                    <p className="font-semibold text-gray-900">
                                      {report.numEmployees || '0'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600 mb-1">Monthly Man-hours:</p>
                                    <p className="font-semibold text-gray-900">
                                      {report.monthlyManHours || '0'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600 mb-1">YTD Man-hours:</p>
                                    <p className="font-semibold text-gray-900">
                                      {report.yearToDateManHours || '0'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600 mb-1">Workdays Lost:</p>
                                    <p className="font-semibold text-gray-900">
                                      {report.workdaysLost || '0'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600 mb-1">LTI Cases:</p>
                                    <p className="font-semibold text-red-700">
                                      {report.ltiCases || '0'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600 mb-1">No LTI Cases:</p>
                                    <p className="font-semibold text-green-700">
                                      {report.noLTICases || '0'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600 mb-1">Near Miss:</p>
                                    <p className="font-semibold text-yellow-700">
                                      {report.nearMissAccidents || '0'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600 mb-1">
                                      Dangerous Occurrences:
                                    </p>
                                    <p className="font-semibold text-orange-700">
                                      {report.dangerousOccurrences || '0'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              {/* Monthly Data Section (updated) */}
                              {report.monthlyData && report.monthlyData.length > 0 && (
                                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                  <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                                    <p className="text-xs font-bold text-gray-700">
                                      Monthly Breakdown
                                    </p>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                      <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                          <th className="px-4 py-2 text-left text-gray-700 font-semibold">
                                            Month
                                          </th>
                                          <th className="px-4 py-2 text-center text-gray-700 font-semibold">
                                            Man Power
                                          </th>
                                          <th className="px-4 py-2 text-center text-gray-700 font-semibold">
                                            Man Hours
                                          </th>
                                          <th className="px-4 py-2 text-center text-gray-700 font-semibold">
                                            Accidents
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-200">
                                        {report.monthlyData
                                          .filter(
                                            (m: any) =>
                                              m.manPower || m.manHours || m.accidents !== '0',
                                          )
                                          .map((monthData: any, mIdx: number) => (
                                            <tr key={mIdx} className="hover:bg-gray-50">
                                              <td className="px-4 py-2 text-gray-900 font-medium">
                                                {monthData.month}
                                              </td>
                                              <td className="px-4 py-2 text-center text-gray-900">
                                                {monthData.manPower || '-'}
                                              </td>
                                              <td className="px-4 py-2 text-center text-gray-900">
                                                {monthData.manHours || '-'}
                                              </td>
                                              <td className="px-4 py-2 text-center">
                                                <span
                                                  className={`font-semibold ${
                                                    monthData.accidents === '0'
                                                      ? 'text-green-700'
                                                      : 'text-red-700'
                                                  }`}
                                                >
                                                  {monthData.accidents || '0'}
                                                </span>
                                              </td>
                                            </tr>
                                          ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                              {/* Safety Rates - Calculated (updated) */}
                              {(report.formulaLtiCases ||
                                report.formulaAnnualAvgEmployees ||
                                report.formulaAnnualTotalManHours) && (
                                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                  <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                                    <p className="text-xs font-bold text-gray-700">
                                      Calculated Safety Rates
                                    </p>
                                  </div>
                                  <div className="grid grid-cols-3 gap-4 p-5">
                                    <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 text-center">
                                      <p className="text-xs text-blue-700 mb-2">LTI Rate</p>
                                      <p className="text-lg font-bold text-blue-900">
                                        {(() => {
                                          const lti = parseFloat(report.formulaLtiCases) || 0;
                                          const employees =
                                            parseFloat(report.formulaAnnualAvgEmployees) || 1;
                                          return ((lti / employees) * 1000).toFixed(2);
                                        })()}
                                      </p>
                                    </div>
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                                      <p className="text-xs text-green-700 mb-2">Frequency Rate</p>
                                      <p className="text-lg font-bold text-green-900">
                                        {(() => {
                                          const lti = parseFloat(report.formulaLtiCases) || 0;
                                          const hours =
                                            parseFloat(report.formulaAnnualTotalManHours) || 1;
                                          return ((lti / hours) * 1000000).toFixed(2);
                                        })()}
                                      </p>
                                    </div>
                                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                                      <p className="text-xs text-orange-700 mb-2">Severity Rate</p>
                                      <p className="text-lg font-bold text-orange-900">
                                        {(() => {
                                          const days = parseFloat(report.formulaWorkdaysLost) || 0;
                                          const hours =
                                            parseFloat(report.formulaAnnualTotalManHours) || 1;
                                          return ((days / hours) * 1000000).toFixed(2);
                                        })()}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {report.remarks && (
                                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                                  <p className="text-xs font-bold text-yellow-900 mb-2">
                                    ⚠️ Remarks:
                                  </p>
                                  <p className="text-xs text-yellow-800">{report.remarks}</p>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null;
          })()}

          {/* HSE Inspection Observations Section - Simplified */}
          {inspection.type === 'hse' &&
            inspection.observations &&
            inspection.observations.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="bg-blue-600 px-5 py-3 rounded-t-xl border-b border-blue-700">
                  <h3 className="text-sm font-semibold text-white">
                    Observations ({inspection.observations.length})
                  </h3>
                </div>
                <div className="p-5 space-y-4">
                  {inspection.observations.map((obs: any, idx: number) => (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-lg p-5 hover:border-blue-400 transition-colors"
                    >
                      <div className="flex items-start gap-3 mb-4">
                        <span className="flex-shrink-0 bg-blue-200 text-blue-800 font-bold px-2.5 py-1 rounded text-xs">
                          #{obs.itemNo || idx + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-sm mb-2">
                            {obs.categoryName || 'General'} - {obs.itemName || 'Observation'}
                          </p>
                          <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 mb-3">
                            <p className="text-xs font-semibold text-blue-900 mb-2">Observation:</p>
                            <p className="text-sm text-gray-800">{obs.observation || 'N/A'}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-gray-600">Location:</span>
                              <p className="font-medium text-gray-900">{obs.location || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Status:</span>
                              <p className="font-medium text-gray-900">{obs.status || 'N/A'}</p>
                            </div>
                            {obs.date && (
                              <div>
                                <span className="text-gray-600">Date:</span>
                                <p className="font-medium text-gray-900">{obs.date}</p>
                              </div>
                            )}
                            {obs.time && (
                              <div>
                                <span className="text-gray-600">Time:</span>
                                <p className="font-medium text-gray-900">{obs.time}</p>
                              </div>
                            )}
                          </div>
                          {obs.actionNeeded && (
                            <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                              <p className="text-xs font-semibold text-yellow-900 mb-2">
                                Action Needed:
                              </p>
                              <p className="text-sm text-gray-800">{obs.actionNeeded}</p>
                            </div>
                          )}
                          {obs.hazards && (
                            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                              <p className="text-xs font-semibold text-red-900 mb-2">Hazards:</p>
                              <p className="text-sm text-gray-800">{obs.hazards}</p>
                            </div>
                          )}
                          {obs.remarks && (
                            <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                              <p className="text-xs font-semibold text-gray-900 mb-2">Remarks:</p>
                              <p className="text-sm text-gray-800">{obs.remarks}</p>
                            </div>
                          )}
                          {obs.photos && obs.photos.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs font-semibold text-gray-700 mb-2">
                                Photos ({obs.photos.length}):
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                {obs.photos.map((photo: string, photoIdx: number) => (
                                  <img
                                    key={photoIdx}
                                    src={photo}
                                    alt={`Observation photo ${photoIdx + 1}`}
                                    className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => setFullImageUrl(photo)}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Review Confirmation Section - Simplified */}
          {inspection.reviewedBy && inspection.reviewedAt && (
            <div
              className={`bg-white rounded-xl shadow-sm border-2 p-5 ${
                inspection.status === 'approved'
                  ? 'border-green-300 bg-green-50'
                  : inspection.status === 'rejected'
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300'
              }`}
            >
              <div className="mb-4">
                <h3
                  className={`text-base font-semibold mb-1 ${
                    inspection.status === 'approved'
                      ? 'text-green-900'
                      : inspection.status === 'rejected'
                      ? 'text-red-900'
                      : 'text-gray-900'
                  }`}
                >
                  {inspection.status === 'approved'
                    ? 'Approved'
                    : inspection.status === 'rejected'
                    ? 'Rejected'
                    : 'Reviewed'}
                </h3>
                <p className="text-xs text-gray-600">
                  {new Date(inspection.reviewedAt).toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div>
                <div className="mb-4">
                  <p className="text-xs text-gray-600 mb-1">Reviewed by:</p>
                  <p className="text-sm font-semibold text-gray-900">{inspection.reviewedBy}</p>
                </div>
                {inspection.reviewerSignature && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-600 mb-2">Signature:</p>
                    <div className="bg-white border border-gray-200 rounded-lg p-2 inline-block">
                      <img
                        src={inspection.reviewerSignature}
                        alt="Reviewer Signature"
                        className="h-16 w-auto"
                      />
                    </div>
                  </div>
                )}
                {inspection.reviewComments && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-600 mb-2">Comments:</p>
                    <p className="text-sm text-gray-800 bg-white/60 p-3 rounded-lg border border-gray-200">
                      {inspection.reviewComments}
                    </p>
                  </div>
                )}
                {inspection.rejectionReason && (
                  <div className="mt-4 pt-4 border-t border-red-200">
                    <p className="text-xs text-red-600 mb-2 font-semibold">Rejection Reason:</p>
                    <p className="text-sm text-red-800 bg-white/60 p-3 rounded-lg border border-red-300">
                      {inspection.rejectionReason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Export Section for Approved Inspections */}
          {user && inspection.status === 'approved' && (
            <div className="bg-white border-t-2 border-green-200 rounded-xl shadow-sm p-5">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-green-900 mb-1">
                    Export Approved Inspection
                  </h3>
                  <p className="text-xs text-gray-600">
                    Re-download the approved inspection report
                  </p>
                </div>

                <button
                  onClick={handleReExport}
                  disabled={processing}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  <span className="text-sm font-semibold">
                    {processing ? 'Exporting...' : 'Download Excel Report'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Supervisor Action Section */}
          {user && inspection.status === 'pending_review' && (
            <div className="bg-white border-t-2 border-gray-200 rounded-xl shadow-sm p-5 space-y-5">
              {/* Review Comments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Comments (Optional)
                </label>
                <textarea
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  rows={3}
                  placeholder="Add any comments or feedback..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                />
              </div>

              {/* Secure Signature Authorization */}
              {!supervisorSignature ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-3">
                    Enter your PIN to authorize signature
                  </p>
                  <button
                    onClick={() => setShowPinVerification(true)}
                    disabled={processing}
                    className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium text-sm"
                  >
                    Authorize Signature
                  </button>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 font-medium">✓ Signature Authorized</p>
                  <p className="text-xs text-green-700 mt-1">
                    {user.name} | {new Date().toLocaleDateString()}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  onClick={() => setShowApproveModal(true)}
                  disabled={processing || !supervisorSignature}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
                >
                  {processing ? 'Processing...' : 'Approve'}
                </button>

                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={processing}
                  className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
                >
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Approve Confirmation Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
            <div
              className="fixed inset-0 transition-opacity bg-black bg-opacity-50"
              onClick={() => !processing && setShowApproveModal(false)}
            />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 pt-5 pb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Approve Inspection</h3>
                <p className="text-sm text-gray-600">
                  This will approve the inspection and generate the report with your signature.
                </p>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end">
                <button
                  onClick={() => setShowApproveModal(false)}
                  disabled={processing}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={processing}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
            <div
              className="fixed inset-0 transition-opacity bg-black bg-opacity-50"
              onClick={() => !processing && setShowRejectModal(false)}
            />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 pt-5 pb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Reject Inspection</h3>
                <p className="text-sm text-gray-600 mb-3">Explain what needs to be corrected</p>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  placeholder="Enter reason..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none text-sm"
                />
              </div>
              <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end">
                <button
                  onClick={() => setShowRejectModal(false)}
                  disabled={processing}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={processing || !rejectionReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PIN Verification Modal */}
      <SignaturePinVerificationModal
        isOpen={showPinVerification}
        onClose={() => setShowPinVerification(false)}
        onVerify={handlePinVerification}
        userName={user?.name}
      />

      {/* Full Image Modal */}
      {fullImageUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setFullImageUrl(null)}
        >
          <div className="relative max-w-7xl max-h-full">
            <button
              onClick={() => setFullImageUrl(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <img
              src={fullImageUrl}
              alt="Full size view"
              className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default InspectionPreviewModal;
