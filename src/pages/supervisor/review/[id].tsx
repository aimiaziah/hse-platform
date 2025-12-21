// src/pages/supervisor/review/[id].tsx - Inspection Review Interface
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import SupervisorLayout from '@/roles/supervisor/layouts/SupervisorLayout';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import { storage } from '@/utils/storage';
import {
  safeFetch,
  sanitizeId,
  validateInspectionType,
  type ValidInspectionType,
} from '@/utils/url-validator';
import { useAuth } from '@/hooks/useAuth';
import {
  exportToSharePoint as exportToSharePointOAuth,
  isSharePointAuthenticated,
  isSharePointOAuthConfigured,
} from '@/utils/sharepoint-oauth';
import {
  uploadToSharePointViaPowerAutomate,
  isPowerAutomateConfigured,
} from '@/utils/powerAutomate';
import {
  generateAndDownloadInspectionPDF,
  generateInspectionPDF,
} from '@/utils/inspectionPdfGenerator';
import {
  generateFireExtinguisherPDF,
  generateFirstAidPDF,
  downloadPDF,
} from '@/utils/templatePdfGenerator';
import PDFViewer from '@/components/PDFViewer';
import PDFJSViewer from '@/components/PDFJSViewer';
import ExcelViewer from '@/components/ExcelViewer';
import jsPDF from 'jspdf';
import ExcelJS from 'exceljs';

type InspectionStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'Open'
  | 'Closed'
  | 'Ongoing';
// Use the validated type from url-validator for type safety
type InspectionType = ValidInspectionType;

interface Inspection {
  id: string;
  type: InspectionType;
  status: InspectionStatus;
  inspectedBy: string;
  inspectorId: string;
  company: string;
  designation: string;
  inspectionDate: string;
  createdAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  reviewComments?: string;
  items: unknown[];
  location?: string;
  signature?: string;
  [key: string]: unknown;
}

const InspectionReview: React.FC = (): JSX.Element => {
  const { user, updateSignature } = useAuth();
  const router = useRouter();
  const { id } = router.query;

  // Validate inspection type from URL to prevent SSRF - returns validated type or throws
  const getValidatedInspectionType = (): InspectionType | null => {
    try {
      if (!router.query.type) return null;
      return validateInspectionType(router.query.type);
    } catch {
      return null;
    }
  };
  const inspectionType = getValidatedInspectionType();

  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewComments, setReviewComments] = useState('');
  const [processing, setProcessing] = useState(false);
  const [excelData, setExcelData] = useState<ArrayBuffer | null>(null);
  const [supervisorSignature, setSupervisorSignature] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [excelPdfUrl, setExcelPdfUrl] = useState<string>('');
  const [viewMode, setViewMode] = useState<'mobile' | 'excel' | 'pdf'>('mobile');
  const [signatureCanvasRef, setSignatureCanvasRef] = useState<HTMLCanvasElement | null>(null);
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);

  // Helper functions - defined before use
  // Map database inspection types to local types
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

  // Load saved signature when component mounts
  useEffect(() => {
    if (user?.signature) {
      setSupervisorSignature(user.signature);
      // Mark that we have a saved signature (not newly drawn)
      setHasDrawnSignature(false);
    }
  }, [user]);

  // Load HSE Excel preview
  const loadHSEExcelPreview = async (inspectionData: Inspection) => {
    try {
      const formData = inspectionData.formData as Record<string, unknown> | undefined;
      const requestBody = {
        contractor: inspectionData.company || (formData?.contractor as string | undefined) || '',
        location: inspectionData.location || (formData?.location as string | undefined) || '',
        date: inspectionData.inspectionDate,
        inspectedBy: inspectionData.inspectedBy,
        workActivity: (formData?.workActivity as string | undefined) || '',
        tablePersons: (formData?.tablePersons as unknown[] | undefined) || [],
        inspectionItems:
          inspectionData.items || (formData?.inspectionItems as unknown[] | undefined) || [],
        commentsRemarks: (formData?.commentsRemarks as string | undefined) || '',
        observations:
          inspectionData.observations || (formData?.observations as unknown[] | undefined) || [],
        reviewedBy: inspectionData.reviewedBy || user?.name,
        reviewedAt: inspectionData.reviewedAt,
        reviewerSignature: supervisorSignature || inspectionData.reviewerSignature,
      };

      // Generate Excel data for download
      const excelResponse = await safeFetch('/api/export/hse-inspection-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...requestBody,
          format: 'excel',
        }),
      });

      if (excelResponse.ok) {
        const arrayBuffer = await excelResponse.arrayBuffer();
        setExcelData(arrayBuffer);
      }

      // Generate PDF for Excel tab preview
      const pdfResponse = await safeFetch('/api/export/hse-inspection-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...requestBody,
          format: 'pdf',
        }),
      });

      if (pdfResponse.ok) {
        const pdfBlob = await pdfResponse.blob();
        const pdfBlobUrl = URL.createObjectURL(pdfBlob);
        setExcelPdfUrl(pdfBlobUrl);
      }
    } catch (error) {
      // Error loading HSE Excel preview - continue even if Excel preview fails
    }
  };

  // Load Excel preview for fire extinguisher and first aid inspections
  const loadExcelPreview = async (inspectionData: Inspection) => {
    try {
      const apiEndpoint =
        inspectionType === 'fire_extinguisher'
          ? '/api/export/fire-extinguisher-template'
          : '/api/export/first-aid-template';

      const requestBody = {
        inspectedBy: inspectionData.inspectedBy,
        inspectionDate: inspectionData.inspectionDate,
        designation: inspectionData.designation,
        signature: inspectionData.signature,
        extinguishers: inspectionData.extinguishers || [],
        kits: inspectionData.kitInspections || inspectionData.kits || [],
        reviewedBy: inspectionData.reviewedBy || user?.name,
        reviewedAt: inspectionData.reviewedAt,
        reviewerSignature: supervisorSignature || inspectionData.reviewerSignature,
      };

      // Generate Excel data for download
      const excelResponse = await safeFetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...requestBody,
          format: 'excel',
        }),
      });

      if (excelResponse.ok) {
        const arrayBuffer = await excelResponse.arrayBuffer();
        setExcelData(arrayBuffer);
      }

      // Generate PDF for Excel tab preview
      const pdfResponse = await safeFetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...requestBody,
          format: 'pdf',
        }),
      });

      if (pdfResponse.ok) {
        const pdfBlob = await pdfResponse.blob();
        const pdfBlobUrl = URL.createObjectURL(pdfBlob);
        setExcelPdfUrl(pdfBlobUrl);
      }
    } catch (error) {
      // Error loading Excel preview - continue even if Excel preview fails - user can still download
    }
  };

  // Generate document (Excel or PDF) with supervisor info for ALL inspection types
  const generateDocument = async (
    inspectionData: Inspection,
    supervisorName: string,
    reviewDate: string,
    signature: string,
    format: 'excel' | 'pdf',
  ): Promise<Buffer> => {
    let apiEndpoint = '';
    let requestBody: Record<string, unknown> = {};

    // Determine API endpoint and prepare request body based on inspection type
    switch (inspectionType) {
      case 'fire_extinguisher':
        apiEndpoint = '/api/export/fire-extinguisher-template';
        requestBody = {
          inspectedBy: inspectionData.inspectedBy,
          inspectionDate: inspectionData.inspectionDate,
          designation: inspectionData.designation,
          signature: inspectionData.signature,
          extinguishers: inspectionData.extinguishers || [],
          reviewedBy: supervisorName,
          reviewedAt: reviewDate,
          reviewerSignature: signature,
          format,
        };
        break;

      case 'first_aid':
        apiEndpoint = '/api/export/first-aid-template';
        requestBody = {
          inspectedBy: inspectionData.inspectedBy,
          inspectionDate: inspectionData.inspectionDate,
          designation: inspectionData.designation,
          signature: inspectionData.signature,
          kits: inspectionData.kitInspections || inspectionData.kits || [],
          reviewedBy: supervisorName,
          reviewedAt: reviewDate,
          reviewerSignature: signature,
          format,
        };
        break;

      case 'hse':
        apiEndpoint = '/api/export/hse-inspection-template';
        const formData = inspectionData.formData as Record<string, unknown> | undefined;
        requestBody = {
          contractor: inspectionData.company || (formData?.contractor as string | undefined) || '',
          location: inspectionData.location || (formData?.location as string | undefined) || '',
          date: inspectionData.inspectionDate,
          inspectedBy: inspectionData.inspectedBy,
          workActivity: (formData?.workActivity as string | undefined) || '',
          tablePersons: (formData?.tablePersons as unknown[] | undefined) || [],
          inspectionItems:
            inspectionData.items || (formData?.inspectionItems as unknown[] | undefined) || [],
          commentsRemarks: (formData?.commentsRemarks as string | undefined) || '',
          observations:
            inspectionData.observations || (formData?.observations as unknown[] | undefined) || [],
          reviewedBy: supervisorName,
          reviewedAt: reviewDate,
          reviewerSignature: signature,
          format,
        };
        break;

      case 'hse_observation':
        apiEndpoint = '/api/export/hse-observation-template';
        const obsFormData = inspectionData.formData as Record<string, unknown> | undefined;
        requestBody = {
          observation:
            inspectionData.observation || (obsFormData?.observation as string | undefined) || '',
          location: inspectionData.location || '',
          observedBy: inspectionData.inspectedBy,
          observedDate: inspectionData.inspectionDate,
          actionNeeded:
            inspectionData.actionNeeded || (obsFormData?.actionNeeded as string | undefined) || '',
          hazards: inspectionData.hazards || (obsFormData?.hazards as string | undefined) || '',
          remarks: inspectionData.remarks || (obsFormData?.remarks as string | undefined) || '',
          status: inspectionData.status || 'Open',
          photos: inspectionData.photos || (obsFormData?.photos as unknown[] | undefined) || [],
          itemNo: inspectionData.itemNo || '1',
          categoryName: inspectionData.categoryName || 'General',
          itemName: inspectionData.itemName || 'Observation',
          reviewedBy: supervisorName,
          reviewedAt: reviewDate,
          reviewerSignature: signature,
          format,
        };
        break;

      case 'manhours':
        apiEndpoint = '/api/export/manhours-template';
        requestBody = {
          preparedBy: inspectionData.inspectedBy || inspectionData.preparedBy,
          preparedDate: inspectionData.inspectionDate,
          reviewedBy: supervisorName,
          reviewedAt: reviewDate,
          reportMonth: inspectionData.reportMonth || '',
          reportYear: inspectionData.reportYear || new Date().getFullYear().toString(),
          numEmployees: inspectionData.numEmployees || '0',
          monthlyManHours: inspectionData.monthlyManHours || '0',
          yearToDateManHours: inspectionData.yearToDateManHours || '0',
          totalAccumulatedManHours: inspectionData.totalAccumulatedManHours || '0',
          annualTotalManHours: inspectionData.annualTotalManHours || '0',
          workdaysLost: inspectionData.workdaysLost || '0',
          ltiCases: inspectionData.ltiCases || '0',
          noLTICases: inspectionData.noLTICases || '0',
          nearMissAccidents: inspectionData.nearMissAccidents || '0',
          dangerousOccurrences: inspectionData.dangerousOccurrences || '0',
          occupationalDiseases: inspectionData.occupationalDiseases || '0',
          formulaLtiCases: inspectionData.formulaLtiCases || '0',
          formulaAnnualAvgEmployees: inspectionData.formulaAnnualAvgEmployees || '0',
          formulaAnnualTotalManHours: inspectionData.formulaAnnualTotalManHours || '0',
          formulaWorkdaysLost: inspectionData.formulaWorkdaysLost || '0',
          projectName: inspectionData.projectName || '',
          monthlyData: inspectionData.monthlyData || [],
          remarks: inspectionData.remarks || '',
          reviewerSignature: signature,
          format,
        };
        break;

      default:
        throw new Error(`Unsupported inspection type: ${inspectionType}`);
    }

    const response = await safeFetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate ${format.toUpperCase()} for ${inspectionType}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  };

  const loadInspection = async () => {
    // Guard against invalid inspection type (SSRF prevention)
    if (!inspectionType) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Sanitize ID to prevent SSRF
      const sanitizedId = sanitizeId(id);
      // First, try to fetch from database
      const response = await safeFetch(`/api/inspections/${sanitizedId}`);
      let found: Inspection | null = null;

      if (response.ok) {
        const result = await response.json();
        const dbInspection = result.inspection;

        if (dbInspection) {
          // Map database inspection to local format
          found = {
            id: dbInspection.id,
            type: mapDbTypeToLocal(dbInspection.inspection_type),
            status: dbInspection.status,
            inspectedBy: dbInspection.inspected_by,
            inspectorId: dbInspection.inspector_id,
            company: dbInspection.form_data?.contractor || '',
            designation: dbInspection.designation || '',
            inspectionDate: dbInspection.inspection_date || dbInspection.created_at?.split('T')[0],
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
            // Include the full form_data for proper handling
            formData: dbInspection.form_data,
            ...dbInspection.form_data, // Spread form_data fields to top level for backward compatibility
          };
        }
      }

      // If not found in database, try localStorage (backward compatibility)
      if (!found) {
        let storageKey = '';
        switch (inspectionType) {
          case 'hse':
            storageKey = 'inspections';
            break;
          case 'fire_extinguisher':
            storageKey = 'fire_extinguisher_inspections';
            break;
          case 'first_aid':
            storageKey = 'first_aid_inspections';
            break;
          case 'hse_observation':
            storageKey = 'hse_observations';
            break;
          case 'manhours':
            storageKey = 'manhours_reports';
            break;
          default:
            storageKey = 'inspections';
        }

        const inspections = storage.load(storageKey, []);
        const sanitizedId = sanitizeId(id);
        found =
          (inspections.find((i: Inspection) => i.id === sanitizedId) as Inspection | undefined) ||
          null;
      }

      if (found) {
        setInspection({ ...found, type: inspectionType });
        setReviewComments(found.reviewComments || '');

        // Generate preview based on inspection type
        try {
          if (inspectionType === 'fire_extinguisher' || inspectionType === 'first_aid') {
            // Load Excel preview for fire extinguisher and first aid
            loadExcelPreview(found);
          } else if (inspectionType === 'hse') {
            // For HSE inspections, load Excel preview if it has checklist data
            loadHSEExcelPreview(found);
          }
        } catch (previewError) {
          // Error generating preview - continue even if preview generation fails
        }
      } else {
        // Inspection not found
        router.back();
      }
    } catch (error) {
      // Error loading inspection
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id && inspectionType) {
      loadInspection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, inspectionType]);

  // Generate both Excel and PDF with supervisor review information for ALL inspection types
  const generateApprovedDocuments = async (
    inspectionData: Inspection,
    supervisorName: string,
    reviewDate: string,
    signature: string,
  ): Promise<{ excelBuffer: Buffer; pdfBuffer: Buffer }> => {
    // Generate both Excel and PDF from the same template
    // This ensures they match exactly
    const [excelBuffer, pdfBuffer] = await Promise.all([
      generateDocument(inspectionData, supervisorName, reviewDate, signature, 'excel'),
      generateDocument(inspectionData, supervisorName, reviewDate, signature, 'pdf'),
    ]);

    return { excelBuffer, pdfBuffer };
  };

  // Download Excel file for preview
  const handleDownloadExcel = async () => {
    if (!inspection) return;

    try {
      let apiEndpoint = '';
      let requestBody: Record<string, unknown> = {};

      if (inspectionType === 'fire_extinguisher') {
        apiEndpoint = '/api/export/fire-extinguisher-template';
        requestBody = {
          inspectedBy: inspection.inspectedBy,
          inspectionDate: inspection.inspectionDate,
          designation: inspection.designation,
          signature: inspection.signature,
          extinguishers: inspection.extinguishers,
          reviewedBy: inspection.reviewedBy || user?.name,
          reviewedAt: inspection.reviewedAt,
          reviewerSignature: supervisorSignature || inspection.reviewerSignature,
          format: 'excel',
        };
      } else if (inspectionType === 'first_aid') {
        apiEndpoint = '/api/export/first-aid-template';
        requestBody = {
          inspectedBy: inspection.inspectedBy,
          inspectionDate: inspection.inspectionDate,
          designation: inspection.designation,
          signature: inspection.signature,
          kits: inspection.kitInspections || inspection.kits,
          reviewedBy: inspection.reviewedBy || user?.name,
          reviewedAt: inspection.reviewedAt,
          reviewerSignature: supervisorSignature || inspection.reviewerSignature,
          format: 'excel',
        };
      } else if (inspectionType === 'hse') {
        apiEndpoint = '/api/export/hse-inspection-template';
        const formData = inspection.formData as Record<string, unknown> | undefined;
        requestBody = {
          contractor: inspection.company || (formData?.contractor as string | undefined) || '',
          location: inspection.location || (formData?.location as string | undefined) || '',
          date: inspection.inspectionDate,
          inspectedBy: inspection.inspectedBy,
          workActivity: (formData?.workActivity as string | undefined) || '',
          tablePersons: (formData?.tablePersons as unknown[] | undefined) || [],
          inspectionItems:
            inspection.items || (formData?.inspectionItems as unknown[] | undefined) || [],
          commentsRemarks: (formData?.commentsRemarks as string | undefined) || '',
          observations:
            inspection.observations || (formData?.observations as unknown[] | undefined) || [],
          reviewedBy: inspection.reviewedBy || user?.name,
          reviewedAt: inspection.reviewedAt,
          reviewerSignature: supervisorSignature || inspection.reviewerSignature,
          format: 'excel',
        };
      }

      const response = await safeFetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to export Excel');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const date = new Date(inspection.inspectionDate);
      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];

      let typeName = 'Inspection';
      if (inspectionType === 'fire_extinguisher') typeName = 'Fire_Extinguisher';
      else if (inspectionType === 'first_aid') typeName = 'First_Aid';
      else if (inspectionType === 'hse') typeName = 'HSE_Inspection';

      const filename = `${typeName}_Checklist_${
        monthNames[date.getMonth()]
      }_${date.getFullYear()}.xlsx`;

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Excel download error:', error);
      alert('Failed to download Excel file');
    }
  };

  const createNotification = (
    inspectorId: string,
    type: 'approval' | 'rejection',
    message: string,
  ) => {
    // Sanitize ID to prevent injection
    const sanitizedId = sanitizeId(id);
    const notifications: any[] = storage.load('notifications', []);
    const notification = {
      id: Date.now().toString(),
      userId: inspectorId,
      inspectionId: sanitizedId,
      type,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    notifications.push(notification);
    storage.save('notifications', notifications);
  };

  const handleApprove = async () => {
    if (!inspection || !user) return;

    if (!supervisorSignature) {
      alert('Please add your signature before approving');
      return;
    }

    setProcessing(true);
    let sharePointExported = false;
    try {
      const reviewDate = new Date().toISOString();

      // Sanitize ID to prevent SSRF
      const sanitizedId = sanitizeId(id);
      // Update inspection in database via API
      const apiResponse = await safeFetch(`/api/inspections/${sanitizedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          reviewComments,
          data: {
            ...((inspection.formData as Record<string, unknown>) || {}),
            reviewerSignature: supervisorSignature,
          },
        }),
      });

      if (!apiResponse.ok) {
        throw new Error('Failed to update inspection status in database');
      }

      // Update inspection status locally
      const updatedInspection: Inspection = {
        ...inspection,
        status: 'approved',
        reviewedAt: reviewDate,
        reviewedBy: user.name,
        reviewComments,
        reviewerSignature: supervisorSignature,
      };

      // Also update localStorage for backward compatibility
      let storageKey = '';
      switch (inspectionType) {
        case 'hse':
          storageKey = 'inspections';
          break;
        case 'fire_extinguisher':
          storageKey = 'fire_extinguisher_inspections';
          break;
        case 'first_aid':
          storageKey = 'first_aid_inspections';
          break;
        case 'hse_observation':
          storageKey = 'hse_observations';
          break;
        case 'manhours':
          storageKey = 'manhours_reports';
          break;
      }

      const inspections = storage.load(storageKey, []);
      if (inspections.length > 0) {
        const updatedInspections = inspections.map((i: Inspection) =>
          i.id === id ? updatedInspection : i,
        );
        storage.save(storageKey, updatedInspections);
      }

      // Generate Excel and PDF with supervisor information for ALL inspection types
      try {
        const { excelBuffer, pdfBuffer } = await generateApprovedDocuments(
          updatedInspection,
          user.name,
          reviewDate,
          supervisorSignature,
        );

        // Convert buffers to blobs for OAuth upload
        const excelBlob = new Blob([excelBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });

        // Try Power Automate first (no popup, more reliable)
        if (isPowerAutomateConfigured()) {
          try {
            console.log('🔄 Using Power Automate for SharePoint upload...');
            const uploadResult = await uploadToSharePointViaPowerAutomate(
              excelBlob,
              pdfBlob,
              updatedInspection,
            );

            // Update inspection with SharePoint links if provided
            if (uploadResult.excelUrl) {
              updatedInspection.sharePointExcelUrl = uploadResult.excelUrl;
            }
            if (uploadResult.pdfUrl) {
              updatedInspection.sharePointPdfUrl = uploadResult.pdfUrl;
            }
            updatedInspection.exportedAt = new Date().toISOString();

            const finalInspections = inspections.map((i: Inspection) =>
              i.id === id ? updatedInspection : i,
            );
            storage.save(storageKey, finalInspections);

            console.log(`✅ ${inspectionType} documents uploaded to SharePoint via Power Automate`);
            sharePointExported = true;
          } catch (powerAutomateError: any) {
            console.error('Power Automate upload error:', powerAutomateError);
            // Sanitize error message to prevent format string injection
            const errorMessage = powerAutomateError?.message
              ? String(powerAutomateError.message).substring(0, 200)
              : 'Unknown error';
            alert(
              `Inspection approved! Power Automate upload encountered an issue: ${errorMessage}. Documents can be downloaded manually.`,
            );
          }
        }
        // Fallback to OAuth if Power Automate not configured
        else if (isSharePointOAuthConfigured()) {
          try {
            console.log('🔄 Using OAuth for SharePoint upload...');
            // Upload both files to SharePoint/OneDrive via OAuth
            const uploadResult = await exportToSharePointOAuth(
              excelBlob,
              pdfBlob,
              updatedInspection,
            );

            // Update inspection with SharePoint links
            updatedInspection.sharePointExcelUrl = uploadResult.excel.webUrl;
            updatedInspection.sharePointPdfUrl = uploadResult.pdf.webUrl;
            updatedInspection.exportedAt = new Date().toISOString();

            const finalInspections = inspections.map((i: Inspection) =>
              i.id === id ? updatedInspection : i,
            );
            storage.save(storageKey, finalInspections);

            console.log(`✅ ${inspectionType} documents uploaded to SharePoint:`, {
              excel: uploadResult.excel.webUrl,
              pdf: uploadResult.pdf.webUrl,
            });

            // Mark as successfully exported
            sharePointExported = true;
          } catch (oauthError: any) {
            console.error('SharePoint OAuth error:', oauthError);
            // Show user-friendly error message
            if (oauthError.message?.includes('Popup blocked')) {
              alert(
                'Inspection approved! Please allow popups for this site to enable automatic SharePoint export. You can download the documents manually instead.',
              );
            } else if (oauthError.message?.includes('cancelled')) {
              alert(
                'Inspection approved! SharePoint authentication was cancelled. Documents can be downloaded manually.',
              );
            } else {
              alert(
                `Inspection approved! SharePoint upload encountered an issue: ${oauthError.message}. Documents can be downloaded manually.`,
              );
            }
          }
        }
        // Neither Power Automate nor OAuth configured
        else {
          console.warn('SharePoint export not configured - skipping automatic upload');
          alert(
            'Inspection approved! Note: SharePoint export is not configured. You can set up Power Automate (recommended) or OAuth. See POWER_AUTOMATE_SETUP.md for details. Documents can be downloaded manually.',
          );
        }
      } catch (exportError) {
        console.error('Document export error:', exportError);
        // Continue even if export fails - files can still be downloaded manually
        alert(
          'Inspection approved! Note: Document generation encountered an issue. Please try downloading the documents manually.',
        );
      }

      // Create notification for inspector
      createNotification(
        inspection.inspectorId || inspection.inspectedBy,
        'approval',
        `Your ${getInspectionTypeName(inspectionType)} inspection has been approved by ${
          user.name
        }${reviewComments ? `: ${reviewComments}` : ''}`,
      );

      // Show appropriate success message based on export status
      if (sharePointExported) {
        alert(
          `${getInspectionTypeName(
            inspectionType,
          )} approved successfully! Excel and PDF reports have been exported to SharePoint.`,
        );
      } else {
        alert(
          `${getInspectionTypeName(
            inspectionType,
          )} approved successfully! Documents are ready to download.`,
        );
      }
      router.push('/supervisor');
    } catch (error) {
      console.error('Error approving inspection:', error);
      alert('Error approving inspection. Please try again.');
    } finally {
      setProcessing(false);
      setShowApproveModal(false);
    }
  };

  const handleReject = async () => {
    if (!inspection || !user) return;
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setProcessing(true);
    try {
      // Sanitize ID to prevent SSRF
      const sanitizedId = sanitizeId(id);
      // Update inspection in database via API
      const apiResponse = await safeFetch(`/api/inspections/${sanitizedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
          reviewComments: rejectionReason,
        }),
      });

      if (!apiResponse.ok) {
        throw new Error('Failed to update inspection status in database');
      }

      // Update inspection status locally
      const updatedInspection: Inspection = {
        ...inspection,
        status: 'rejected',
        reviewedAt: new Date().toISOString(),
        reviewedBy: user.name,
        rejectionReason,
        reviewComments,
      };

      // Also update localStorage for backward compatibility
      let storageKey = '';
      switch (inspectionType) {
        case 'hse':
          storageKey = 'inspections';
          break;
        case 'fire_extinguisher':
          storageKey = 'fire_extinguisher_inspections';
          break;
        case 'first_aid':
          storageKey = 'first_aid_inspections';
          break;
        case 'hse_observation':
          storageKey = 'hse_observations';
          break;
        case 'manhours':
          storageKey = 'manhours_reports';
          break;
      }

      const inspections = storage.load(storageKey, []);
      if (inspections.length > 0) {
        const updatedInspections = inspections.map((i: Inspection) =>
          i.id === id ? updatedInspection : i,
        );
        storage.save(storageKey, updatedInspections);
      }

      // Create notification for inspector
      createNotification(
        inspection.inspectorId || inspection.inspectedBy,
        'rejection',
        `Your ${getInspectionTypeName(inspectionType)} inspection has been rejected by ${
          user.name
        }. Reason: ${rejectionReason}`,
      );

      alert('Inspection rejected. Inspector has been notified to revise and resubmit.');
      router.push('/supervisor');
    } catch (error) {
      console.error('Error rejecting inspection:', error);
      alert('Error rejecting inspection. Please try again.');
    } finally {
      setProcessing(false);
      setShowRejectModal(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!inspection || !user) return;

    try {
      // Use template-based PDF for all types
      await downloadTemplateBasedPDF();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  // Load PDF URL for PDF.js viewer
  const loadPdfUrl = async () => {
    if (!inspection) return;

    try {
      // Check if SharePoint PDF URL exists
      if (inspection.sharePointPdfUrl) {
        setPdfUrl(inspection.sharePointPdfUrl as string);
        setViewMode('pdf');
        return;
      }

      // Generate PDF blob URL for preview
      const pdfBlob = await generatePdfBlob();
      if (pdfBlob) {
        const blobUrl = URL.createObjectURL(pdfBlob);
        setPdfUrl(blobUrl);
        setViewMode('pdf');
      }
    } catch (error) {
      console.error('Error loading PDF URL:', error);
    }
  };

  // Generate PDF blob for preview
  const generatePdfBlob = async (): Promise<Blob | null> => {
    if (!inspection) return null;

    try {
      let apiEndpoint = '';
      let requestBody: Record<string, unknown> = {};

      if (inspectionType === 'fire_extinguisher') {
        apiEndpoint = '/api/export/fire-extinguisher-template';
        requestBody = {
          inspectedBy: inspection.inspectedBy,
          inspectionDate: inspection.inspectionDate,
          designation: inspection.designation,
          signature: inspection.signature,
          extinguishers: inspection.extinguishers,
          reviewedBy: inspection.reviewedBy || user?.name,
          reviewedAt: inspection.reviewedAt,
          reviewerSignature: supervisorSignature || inspection.reviewerSignature,
          format: 'pdf',
        };
      } else if (inspectionType === 'first_aid') {
        apiEndpoint = '/api/export/first-aid-template';
        requestBody = {
          inspectedBy: inspection.inspectedBy,
          inspectionDate: inspection.inspectionDate,
          designation: inspection.designation,
          signature: inspection.signature,
          kits: inspection.kitInspections || inspection.kits,
          reviewedBy: inspection.reviewedBy || user?.name,
          reviewedAt: inspection.reviewedAt,
          reviewerSignature: supervisorSignature || inspection.reviewerSignature,
          format: 'pdf',
        };
      } else if (inspectionType === 'hse') {
        apiEndpoint = '/api/export/hse-inspection-template';
        const formData = inspection.formData as Record<string, unknown> | undefined;
        requestBody = {
          contractor: inspection.company || (formData?.contractor as string | undefined) || '',
          location: inspection.location || (formData?.location as string | undefined) || '',
          date: inspection.inspectionDate,
          inspectedBy: inspection.inspectedBy,
          workActivity: (formData?.workActivity as string | undefined) || '',
          tablePersons: (formData?.tablePersons as unknown[] | undefined) || [],
          inspectionItems:
            inspection.items || (formData?.inspectionItems as unknown[] | undefined) || [],
          commentsRemarks: (formData?.commentsRemarks as string | undefined) || '',
          observations:
            inspection.observations || (formData?.observations as unknown[] | undefined) || [],
          reviewedBy: inspection.reviewedBy || user?.name,
          reviewedAt: inspection.reviewedAt,
          reviewerSignature: supervisorSignature || inspection.reviewerSignature,
          format: 'pdf',
        };
      }

      const response = await safeFetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      return await response.blob();
    } catch (error) {
      console.error('Error generating PDF blob:', error);
      return null;
    }
  };

  const downloadTemplateBasedPDF = async () => {
    if (!inspection) return;

    try {
      // Use the appropriate API endpoint based on inspection type
      let apiEndpoint = '';
      let requestBody: Record<string, unknown> = {};

      if (inspectionType === 'fire_extinguisher') {
        apiEndpoint = '/api/export/fire-extinguisher-template';
        requestBody = {
          inspectedBy: inspection.inspectedBy,
          inspectionDate: inspection.inspectionDate,
          designation: inspection.designation,
          signature: inspection.signature,
          extinguishers: inspection.extinguishers,
          reviewedBy: inspection.reviewedBy || user?.name,
          reviewedAt: inspection.reviewedAt,
          reviewerSignature: supervisorSignature || inspection.reviewerSignature,
          format: 'pdf',
        };
      } else if (inspectionType === 'first_aid') {
        apiEndpoint = '/api/export/first-aid-template';
        requestBody = {
          inspectedBy: inspection.inspectedBy,
          inspectionDate: inspection.inspectionDate,
          designation: inspection.designation,
          signature: inspection.signature,
          kits: inspection.kitInspections || inspection.kits,
          reviewedBy: inspection.reviewedBy || user?.name,
          reviewedAt: inspection.reviewedAt,
          reviewerSignature: supervisorSignature || inspection.reviewerSignature,
          format: 'pdf',
        };
      } else if (inspectionType === 'hse') {
        apiEndpoint = '/api/export/hse-inspection-template';
        const formData = inspection.formData as Record<string, unknown> | undefined;
        requestBody = {
          contractor: inspection.company || (formData?.contractor as string | undefined) || '',
          location: inspection.location || (formData?.location as string | undefined) || '',
          date: inspection.inspectionDate,
          inspectedBy: inspection.inspectedBy,
          workActivity: (formData?.workActivity as string | undefined) || '',
          tablePersons: (formData?.tablePersons as unknown[] | undefined) || [],
          inspectionItems:
            inspection.items || (formData?.inspectionItems as unknown[] | undefined) || [],
          commentsRemarks: (formData?.commentsRemarks as string | undefined) || '',
          observations:
            inspection.observations || (formData?.observations as unknown[] | undefined) || [],
          reviewedBy: inspection.reviewedBy || user?.name,
          reviewedAt: inspection.reviewedAt,
          reviewerSignature: supervisorSignature || inspection.reviewerSignature,
          format: 'pdf',
        };
      }

      const response = await safeFetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to export PDF from template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const date = new Date(inspection.inspectionDate);
      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];

      let typeName = 'Inspection';
      if (inspectionType === 'fire_extinguisher') typeName = 'Fire_Extinguisher';
      else if (inspectionType === 'first_aid') typeName = 'First_Aid';
      else if (inspectionType === 'hse') typeName = 'HSE_Inspection';

      const filename = `${typeName}_Checklist_${
        monthNames[date.getMonth()]
      }_${date.getFullYear()}.pdf`;

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Template PDF export error:', error);
      throw error;
    }
  };

  // Test SharePoint OAuth Export
  const handleTestSharePointExport = async () => {
    if (!inspection) return;

    try {
      setProcessing(true);

      // Generate Excel blob
      const excelResponse = await safeFetch(getApiEndpointForType(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getRequestBodyForType('excel')),
      });

      if (!excelResponse.ok) throw new Error('Failed to generate Excel');
      const excelBlob = await excelResponse.blob();

      // Generate PDF blob
      const pdfResponse = await safeFetch(getApiEndpointForType(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getRequestBodyForType('pdf')),
      });

      if (!pdfResponse.ok) throw new Error('Failed to generate PDF');
      const pdfBlob = await pdfResponse.blob();

      // Export to SharePoint via OAuth
      const result = await exportToSharePointOAuth(excelBlob, pdfBlob, inspection);

      console.log('✅ SharePoint Export Success!', result);
      alert(
        `Success! Files uploaded to OneDrive:\n\n📊 Excel: ${result.excel.webUrl}\n\n📄 PDF: ${result.pdf.webUrl}\n\nCheck your OneDrive > InspectionReports folder`,
      );
    } catch (error) {
      console.error('SharePoint export error:', error);
      alert(
        `SharePoint export failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }\n\nCheck browser console for details.`,
      );
    } finally {
      setProcessing(false);
    }
  };

  const getApiEndpointForType = () => {
    switch (inspectionType) {
      case 'fire_extinguisher':
        return '/api/export/fire-extinguisher-template';
      case 'first_aid':
        return '/api/export/first-aid-template';
      case 'hse':
        return '/api/export/hse-inspection-template';
      case 'hse_observation':
        return '/api/export/hse-observation-template';
      case 'manhours':
        return '/api/export/manhours-template';
      default:
        throw new Error('Unsupported inspection type');
    }
  };

  const getRequestBodyForType = (format: 'excel' | 'pdf') => {
    const baseBody = {
      reviewedBy: user?.name,
      reviewedAt: new Date().toISOString(),
      reviewerSignature: supervisorSignature || inspection?.reviewerSignature,
      format,
    };

    switch (inspectionType) {
      case 'fire_extinguisher':
        return {
          ...baseBody,
          inspectedBy: inspection?.inspectedBy,
          inspectionDate: inspection?.inspectionDate,
          designation: inspection?.designation,
          signature: inspection?.signature,
          extinguishers: inspection?.extinguishers || [],
        };
      case 'first_aid':
        return {
          ...baseBody,
          inspectedBy: inspection?.inspectedBy,
          inspectionDate: inspection?.inspectionDate,
          designation: inspection?.designation,
          signature: inspection?.signature,
          kits: inspection?.kitInspections || inspection?.kits || [],
        };
      case 'hse':
        const hseFormData = inspection?.formData as Record<string, unknown> | undefined;
        return {
          ...baseBody,
          contractor: inspection?.company || (hseFormData?.contractor as string | undefined) || '',
          location: inspection?.location || (hseFormData?.location as string | undefined) || '',
          date: inspection?.inspectionDate,
          inspectedBy: inspection?.inspectedBy,
          workActivity: (hseFormData?.workActivity as string | undefined) || '',
          tablePersons: (hseFormData?.tablePersons as unknown[] | undefined) || [],
          inspectionItems:
            inspection?.items || (hseFormData?.inspectionItems as unknown[] | undefined) || [],
          commentsRemarks: (hseFormData?.commentsRemarks as string | undefined) || '',
          observations:
            inspection?.observations || (hseFormData?.observations as unknown[] | undefined) || [],
        };
      case 'hse_observation':
        const obsFormData = inspection?.formData as Record<string, unknown> | undefined;
        return {
          ...baseBody,
          observation:
            inspection?.observation || (obsFormData?.observation as string | undefined) || '',
          location: inspection?.location || '',
          observedBy: inspection?.inspectedBy,
          observedDate: inspection?.inspectionDate,
          actionNeeded:
            inspection?.actionNeeded || (obsFormData?.actionNeeded as string | undefined) || '',
          hazards: inspection?.hazards || (obsFormData?.hazards as string | undefined) || '',
          remarks: inspection?.remarks || (obsFormData?.remarks as string | undefined) || '',
          status: inspection?.status || 'Open',
          photos: inspection?.photos || (obsFormData?.photos as unknown[] | undefined) || [],
        };
      case 'manhours':
        return {
          ...baseBody,
          preparedBy: inspection?.inspectedBy || inspection?.preparedBy,
          preparedDate: inspection?.inspectionDate,
          reportMonth: inspection?.reportMonth || '',
          reportYear: inspection?.reportYear || new Date().getFullYear().toString(),
          numEmployees: inspection?.numEmployees || '0',
          monthlyManHours: inspection?.monthlyManHours || '0',
          ltiCases: inspection?.ltiCases || '0',
          nearMissAccidents: inspection?.nearMissAccidents || '0',
          monthlyData: inspection?.monthlyData || [],
        };
      default:
        throw new Error('Unsupported inspection type');
    }
  };

  // Unused function - kept for potential future use
  // const mapInspectionType = (
  //   type: InspectionType,
  // ): 'fire_extinguisher' | 'first_aid' | 'hse_general' | 'hse_observation' | 'manhours' => {
  //   switch (type) {
  //     case 'fire_extinguisher':
  //       return 'fire_extinguisher';
  //     case 'first_aid':
  //       return 'first_aid';
  //     case 'hse_observation':
  //       return 'hse_observation';
  //     case 'manhours':
  //       return 'manhours';
  //     case 'hse':
  //     default:
  //       return 'hse_general';
  //   }
  // };

  // Unused function - kept for potential future use
  // const mapFormData = (inspectionData: Inspection, type: InspectionType) => {
  //   switch (type) {
  //     case 'fire_extinguisher':
  //       return {
  //         extinguishers: inspectionData.extinguishers || [],
  //       };
  //     case 'first_aid':
  //       return {
  //         kits: inspectionData.kits || [],
  //       };
  //     case 'hse':
  //       return {
  //         contractorInfo: inspectionData.contractorInfo || {},
  //         categories: inspectionData.categories || inspectionData.items || [],
  //         observations: inspectionData.observations || [],
  //       };
  //     case 'hse_observation':
  //       return {
  //         observation: inspectionData.observation || '',
  //         location: inspectionData.location || '',
  //         actionNeeded: inspectionData.actionNeeded || '',
  //         hazards: inspectionData.hazards || '',
  //         remarks: inspectionData.remarks || '',
  //         photos: inspectionData.photos || [],
  //         status: inspectionData.status || '',
  //       };
  //     case 'manhours':
  //       return {
  //         reportMonth: inspectionData.reportMonth || '',
  //         reportYear: inspectionData.reportYear || '',
  //         numEmployees: inspectionData.numEmployees || '',
  //         monthlyManHours: inspectionData.monthlyManHours || '',
  //         ltiCases: inspectionData.ltiCases || '0',
  //         nearMissAccidents: inspectionData.nearMissAccidents || '0',
  //         monthlyData: inspectionData.monthlyData || [],
  //       };
  //     default:
  //       return inspectionData;
  //   }
  // };

  const getInspectionTypeIcon = (type: InspectionType) => {
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

  // Unused function - kept for potential future use
  // const getRatingColor = (rating: string) => {
  //   switch (rating) {
  //     case 'G':
  //     case 'GOOD':
  //     case '✓':
  //       return 'bg-green-100 text-green-800 border-green-300';
  //     case 'A':
  //       return 'bg-blue-100 text-blue-800 border-blue-300';
  //     case 'P':
  //       return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  //     case 'X':
  //     case 'SIN':
  //     case 'SPS':
  //     case 'SWO':
  //     case 'FAIL':
  //       return 'bg-red-100 text-red-800 border-red-300';
  //     case 'NA':
  //       return 'bg-gray-100 text-gray-800 border-gray-300';
  //     default:
  //       return 'bg-gray-100 text-gray-600 border-gray-300';
  //   }
  // };

  if (loading) {
    return (
      <ProtectedRoute requiredPermission="canReviewInspections">
        <SupervisorLayout title="Review Inspection">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        </SupervisorLayout>
      </ProtectedRoute>
    );
  }

  // Guard against invalid inspection type (SSRF prevention)
  if (!inspectionType) {
    return (
      <ProtectedRoute requiredPermission="canReviewInspections">
        <SupervisorLayout title="Review Inspection">
          <div className="text-center py-12">
            <p className="text-red-500">Invalid inspection type</p>
            <button
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        </SupervisorLayout>
      </ProtectedRoute>
    );
  }

  if (!inspection) {
    return (
      <ProtectedRoute requiredPermission="canReviewInspections">
        <SupervisorLayout title="Review Inspection">
          <div className="text-center py-12">
            <p className="text-gray-500">Inspection not found</p>
          </div>
        </SupervisorLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredPermission="canReviewInspections">
      <SupervisorLayout title="Review Inspection">
        <div className="max-w-5xl mx-auto space-y-6 p-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <span>{getInspectionTypeIcon(inspectionType)}</span>
                  Review {getInspectionTypeName(inspectionType)}
                </h1>
                <p className="text-gray-600 text-sm mt-1">
                  Submitted{' '}
                  {new Date(inspection.submittedAt || inspection.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              {/* Download Excel button for all inspection types */}
              <button
                type="button"
                onClick={handleDownloadExcel}
                disabled={processing}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title={
                  inspectionType === 'hse' &&
                  inspection.observations &&
                  inspection.observations.length > 0
                    ? 'Download Excel with Observations'
                    : 'Download Excel Report'
                }
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Download Excel
                {inspectionType === 'hse' &&
                  inspection.observations &&
                  inspection.observations.length > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 bg-orange-500 text-white rounded-full text-xs font-bold">
                      +{inspection.observations.length}
                    </span>
                  )}
              </button>
              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={processing}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title="Download PDF Report"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Download PDF
              </button>
              {/* SharePoint OAuth Export Button */}
              <button
                type="button"
                onClick={handleTestSharePointExport}
                disabled={processing}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title="Export to SharePoint/OneDrive via OAuth"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                📁 Export to SharePoint
              </button>
              <button
                type="button"
                onClick={() => setShowRejectModal(true)}
                disabled={processing}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Reject
              </button>
              <button
                type="button"
                onClick={() => setShowApproveModal(true)}
                disabled={processing}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Approve & Export
              </button>
            </div>
          </div>

          {/* Inspection Details */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Inspection Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Inspector</p>
                <p className="font-medium text-gray-900">{inspection.inspectedBy || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Company</p>
                <p className="font-medium text-gray-900">{inspection.company || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Designation</p>
                <p className="font-medium text-gray-900">{inspection.designation || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Inspection Date</p>
                <p className="font-medium text-gray-900">
                  {new Date(inspection.inspectionDate).toLocaleDateString()}
                </p>
              </div>
              {inspection.location && (
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium text-gray-900">{inspection.location}</p>
                </div>
              )}
              {inspectionType === 'hse' && inspection.totalObservations > 0 && (
                <div>
                  <p className="text-sm text-gray-500">Total Observations</p>
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold">
                      {inspection.totalObservations}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* HSE Observations Section (if applicable) */}
          {inspectionType === 'hse' &&
            inspection.observations &&
            inspection.observations.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-orange-600">📋</span>
                  HSE Observation Forms ({inspection.observations.length})
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  The following observations were documented during this inspection:
                </p>
                <div className="space-y-4">
                  {inspection.observations.map((obs: any, index: number) => (
                    <div
                      key={obs.id || index}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                              Item #{obs.itemNo}
                            </span>
                            <span
                              className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
                                obs.status === 'Open'
                                  ? 'bg-red-100 text-red-700'
                                  : obs.status === 'Closed'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {obs.status}
                            </span>
                          </div>
                          <h3 className="font-semibold text-gray-900 text-sm mb-1">
                            {obs.categoryName} - {obs.itemName}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">Location:</span> {obs.location || 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="font-medium text-gray-700 mb-1">Observation:</p>
                          <p className="text-gray-600 bg-gray-50 p-2 rounded">{obs.observation}</p>
                        </div>

                        {obs.actionNeeded && (
                          <div>
                            <p className="font-medium text-gray-700 mb-1">Action Needed:</p>
                            <p className="text-gray-600 bg-yellow-50 p-2 rounded border-l-4 border-yellow-400">
                              {obs.actionNeeded}
                            </p>
                          </div>
                        )}

                        {obs.hazards && (
                          <div>
                            <p className="font-medium text-gray-700 mb-1">Hazards Identified:</p>
                            <p className="text-gray-600 bg-red-50 p-2 rounded border-l-4 border-red-400">
                              {obs.hazards}
                            </p>
                          </div>
                        )}

                        {obs.remarks && (
                          <div>
                            <p className="font-medium text-gray-700 mb-1">Remarks:</p>
                            <p className="text-gray-600 bg-gray-50 p-2 rounded">{obs.remarks}</p>
                          </div>
                        )}

                        {obs.photos && obs.photos.length > 0 && (
                          <div>
                            <p className="font-medium text-gray-700 mb-2">
                              Photos ({obs.photos.length}):
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {obs.photos.map((photo: string, photoIndex: number) => (
                                <div
                                  key={photoIndex}
                                  className="relative aspect-video bg-gray-100 rounded overflow-hidden border"
                                >
                                  <img
                                    src={photo}
                                    alt={`Observation photo ${photoIndex + 1}`}
                                    className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                                    onClick={() => window.open(photo, '_blank')}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                          <div>
                            <p className="text-xs text-gray-500">Prepared By</p>
                            <p className="text-sm font-medium text-gray-700">
                              {obs.preparedBy || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {obs.preparedByDate
                                ? new Date(obs.preparedByDate).toLocaleDateString()
                                : ''}
                            </p>
                          </div>
                          {obs.reviewedBy && (
                            <div>
                              <p className="text-xs text-gray-500">Reviewed By</p>
                              <p className="text-sm font-medium text-gray-700">{obs.reviewedBy}</p>
                              <p className="text-xs text-gray-500">
                                {obs.reviewedByDate
                                  ? new Date(obs.reviewedByDate).toLocaleDateString()
                                  : ''}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Preview - Mobile / PDF / Excel */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {/* View Mode Toggle */}
            <div className="bg-gray-50 border-b px-4 py-3 flex items-center justify-between">
              <h2 className="text-base md:text-lg font-semibold text-gray-900">Document Preview</h2>
              <div className="flex items-center gap-1 bg-white rounded-lg p-1 border">
                <button
                  onClick={() => setViewMode('mobile')}
                  className={`px-2 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-colors ${
                    viewMode === 'mobile'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-1 md:gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="hidden sm:inline">Mobile</span>
                  </span>
                </button>
                <button
                  onClick={() => setViewMode('excel')}
                  className={`px-2 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-colors ${
                    viewMode === 'excel'
                      ? 'bg-red-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="View as PDF (easier on mobile)"
                >
                  <span className="flex items-center gap-1 md:gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="hidden sm:inline">PDF Preview</span>
                    <span className="sm:hidden">PDF</span>
                  </span>
                </button>
                <button
                  onClick={() => {
                    setViewMode('pdf');
                    if (!pdfUrl) loadPdfUrl();
                  }}
                  className={`px-2 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-colors ${
                    viewMode === 'pdf'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Alternative PDF viewer"
                >
                  <span className="flex items-center gap-1 md:gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    <span className="hidden sm:inline">Alt View</span>
                    <span className="sm:hidden">Alt</span>
                  </span>
                </button>
              </div>
            </div>

            {/* Document Viewer */}
            <div className="p-4 md:p-6">
              {viewMode === 'mobile' ? (
                <div className="space-y-4">
                  {/* Mobile-Friendly View */}
                  {inspectionType === 'fire_extinguisher' && inspection?.extinguishers && (
                    <div className="space-y-3">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <h3 className="text-sm font-semibold text-red-900 mb-1">
                          Fire Extinguisher Inspection
                        </h3>
                        <p className="text-xs text-red-700">
                          Total Items: {inspection.extinguishers.length}
                        </p>
                      </div>
                      {inspection.extinguishers.map((item: any, index: number) => (
                        <div
                          key={index}
                          className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded">
                                  #{index + 1}
                                </span>
                                <span
                                  className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                                    item.rating === 'PASS'
                                      ? 'bg-green-100 text-green-800'
                                      : item.rating === 'FAIL'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {item.rating || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-xs text-gray-500">Location</p>
                                <p className="font-medium text-gray-900">
                                  {item.location || 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Type</p>
                                <p className="font-medium text-gray-900">{item.type || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-xs text-gray-500">Capacity</p>
                                <p className="font-medium text-gray-900">
                                  {item.capacity || 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Manufacturer</p>
                                <p className="font-medium text-gray-900">
                                  {item.manufacturer || 'N/A'}
                                </p>
                              </div>
                            </div>
                            {item.remarks && (
                              <div className="pt-2 border-t border-gray-100">
                                <p className="text-xs text-gray-500 mb-1">Remarks</p>
                                <p className="text-sm text-gray-700 bg-yellow-50 p-2 rounded">
                                  {item.remarks}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {inspectionType === 'first_aid' &&
                    (inspection?.kits || inspection?.kitInspections) && (
                      <div className="space-y-3">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <h3 className="text-sm font-semibold text-green-900 mb-1">
                            First Aid Kit Inspection
                          </h3>
                          <p className="text-xs text-green-700">
                            Total Kits:{' '}
                            {(inspection.kits || inspection.kitInspections || []).length}
                          </p>
                        </div>
                        {(inspection.kits || inspection.kitInspections || []).map(
                          (kit: any, kitIndex: number) => (
                            <div
                              key={kitIndex}
                              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                            >
                              <div className="mb-3 pb-3 border-b border-gray-100">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                                    Kit #{kitIndex + 1}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <p className="text-xs text-gray-500">Location</p>
                                    <p className="font-medium text-gray-900">
                                      {kit.location || 'N/A'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Kit ID</p>
                                    <p className="font-medium text-gray-900">
                                      {kit.kitId || kit.id || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              {kit.items && kit.items.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold text-gray-700">Items:</p>
                                  {kit.items.map((item: any, itemIndex: number) => (
                                    <div
                                      key={itemIndex}
                                      className="bg-gray-50 p-2 rounded border border-gray-100"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm font-medium text-gray-900 flex-1">
                                          {item.name || item.itemName}
                                        </p>
                                        <span
                                          className={`inline-block px-2 py-0.5 text-xs font-semibold rounded ${
                                            item.status === 'GOOD'
                                              ? 'bg-green-100 text-green-800'
                                              : item.status === 'EXPIRED'
                                              ? 'bg-red-100 text-red-800'
                                              : item.status === 'MISSING'
                                              ? 'bg-orange-100 text-orange-800'
                                              : item.status === 'DAMAGED'
                                              ? 'bg-red-100 text-red-800'
                                              : 'bg-gray-100 text-gray-800'
                                          }`}
                                        >
                                          {item.status || 'N/A'}
                                        </span>
                                      </div>
                                      {item.quantity && (
                                        <p className="text-xs text-gray-600 mt-1">
                                          Qty: {item.quantity}
                                        </p>
                                      )}
                                      {item.expiryDate && (
                                        <p className="text-xs text-gray-600">
                                          Expiry: {item.expiryDate}
                                        </p>
                                      )}
                                      {item.remarks && (
                                        <p className="text-xs text-gray-700 mt-1 bg-white p-1 rounded">
                                          {item.remarks}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    )}

                  {inspectionType === 'hse' &&
                    (inspection?.items || inspection?.formData?.inspectionItems) && (
                      <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <h3 className="text-sm font-semibold text-blue-900 mb-1">
                            HSE Inspection
                          </h3>
                          <p className="text-xs text-blue-700">
                            Total Items:{' '}
                            {
                              (inspection.items || inspection.formData?.inspectionItems || [])
                                .length
                            }
                          </p>
                        </div>
                        {(inspection.items || inspection.formData?.inspectionItems || []).map(
                          (item: any, index: number) => (
                            <div
                              key={index}
                              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded">
                                      #{index + 1}
                                    </span>
                                    <span
                                      className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                                        item.rating === 'G'
                                          ? 'bg-green-100 text-green-800'
                                          : item.rating === 'A'
                                          ? 'bg-blue-100 text-blue-800'
                                          : item.rating === 'P'
                                          ? 'bg-yellow-100 text-yellow-800'
                                          : ['SIN', 'SPS', 'SWO', 'X'].includes(item.rating)
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-gray-100 text-gray-800'
                                      }`}
                                    >
                                      {item.rating || 'N/A'}
                                    </span>
                                  </div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {item.category || item.categoryName}
                                  </p>
                                  <p className="text-xs text-gray-600 mt-1">
                                    {item.item || item.itemName}
                                  </p>
                                </div>
                              </div>
                              {item.remarks && (
                                <div className="mt-2 pt-2 border-t border-gray-100">
                                  <p className="text-xs text-gray-500 mb-1">Remarks</p>
                                  <p className="text-sm text-gray-700 bg-yellow-50 p-2 rounded">
                                    {item.remarks}
                                  </p>
                                </div>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    )}

                  {inspectionType === 'hse_observation' && inspection && (
                    <div className="space-y-4">
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-orange-900 mb-2">
                          HSE Observation
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-orange-700 font-medium">Observed By:</p>
                            <p className="text-gray-900">
                              {inspection.observedBy || inspection.inspectedBy}
                            </p>
                          </div>
                          <div>
                            <p className="text-orange-700 font-medium">Date:</p>
                            <p className="text-gray-900">
                              {new Date(
                                inspection.date || inspection.inspectionDate,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-orange-700 font-medium">Location:</p>
                            <p className="text-gray-900">{inspection.location || 'N/A'}</p>
                          </div>
                          {inspection.status && (
                            <div>
                              <p className="text-orange-700 font-medium">Status:</p>
                              <span
                                className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                                  inspection.status === 'Open'
                                    ? 'bg-red-100 text-red-700'
                                    : inspection.status === 'Closed'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}
                              >
                                {inspection.status}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-1">Observation:</p>
                          <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                            {inspection.observation || 'N/A'}
                          </p>
                        </div>

                        {inspection.actionNeeded && (
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">
                              Action Needed:
                            </p>
                            <p className="text-sm text-gray-900 bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
                              {inspection.actionNeeded}
                            </p>
                          </div>
                        )}

                        {inspection.hazards && (
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">
                              Hazards Identified:
                            </p>
                            <p className="text-sm text-gray-900 bg-red-50 p-3 rounded border-l-4 border-red-400">
                              {inspection.hazards}
                            </p>
                          </div>
                        )}

                        {inspection.remarks && (
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">Remarks:</p>
                            <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                              {inspection.remarks}
                            </p>
                          </div>
                        )}

                        {inspection.photos && inspection.photos.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-2">
                              Photos ({inspection.photos.length}):
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {inspection.photos.map((photo: string, index: number) => (
                                <img
                                  key={index}
                                  src={photo}
                                  alt={`Photo ${index + 1}`}
                                  className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-90"
                                  onClick={() => window.open(photo, '_blank')}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {inspectionType === 'manhours' && inspection && (
                    <div className="space-y-4">
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-purple-900 mb-2">
                          Monthly Manhours Report
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-purple-700 font-medium">Prepared By:</p>
                            <p className="text-gray-900">
                              {inspection.preparedBy || inspection.inspectedBy}
                            </p>
                          </div>
                          <div>
                            <p className="text-purple-700 font-medium">Report Period:</p>
                            <p className="text-gray-900">
                              {inspection.reportMonth} {inspection.reportYear}
                            </p>
                          </div>
                          <div>
                            <p className="text-purple-700 font-medium">Date Prepared:</p>
                            <p className="text-gray-900">
                              {new Date(
                                inspection.preparedDate || inspection.createdAt,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          {inspection.reviewedBy && (
                            <div>
                              <p className="text-purple-700 font-medium">Reviewed By:</p>
                              <p className="text-gray-900">{inspection.reviewedBy}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                        <h4 className="font-semibold text-gray-900">Safety Statistics</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-blue-50 p-2 rounded">
                            <p className="text-gray-600 text-xs">Employees</p>
                            <p className="text-lg font-bold text-blue-900">
                              {inspection.numEmployees || '0'}
                            </p>
                          </div>
                          <div className="bg-green-50 p-2 rounded">
                            <p className="text-gray-600 text-xs">Monthly Hours</p>
                            <p className="text-lg font-bold text-green-900">
                              {inspection.monthlyManHours || '0'}
                            </p>
                          </div>
                          <div className="bg-yellow-50 p-2 rounded">
                            <p className="text-gray-600 text-xs">LTI Cases</p>
                            <p className="text-lg font-bold text-yellow-900">
                              {inspection.ltiCases || '0'}
                            </p>
                          </div>
                          <div className="bg-purple-50 p-2 rounded">
                            <p className="text-gray-600 text-xs">Near Miss</p>
                            <p className="text-lg font-bold text-purple-900">
                              {inspection.nearMissAccidents || '0'}
                            </p>
                          </div>
                        </div>

                        {inspection.remarks && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm font-semibold text-gray-700 mb-1">Remarks:</p>
                            <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                              {inspection.remarks}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!inspection?.extinguishers &&
                    !inspection?.kits &&
                    !inspection?.kitInspections &&
                    !inspection?.items &&
                    !inspection?.formData?.inspectionItems &&
                    inspectionType !== 'hse_observation' &&
                    inspectionType !== 'manhours' && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
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
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <p className="mt-3 text-sm text-gray-500">No inspection data available</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Try viewing in Excel or PDF mode
                        </p>
                      </div>
                    )}
                </div>
              ) : viewMode === 'excel' ? (
                excelPdfUrl ? (
                  <PDFJSViewer
                    pdfUrl={excelPdfUrl}
                    viewerPath="/pdf-viewer/web/viewer.html"
                    enablePrint
                    enableDownload
                    showToolbar
                    height="700px"
                    onError={(error) => {
                      console.error('PDF.js viewer error:', error);
                      alert('Error loading PDF viewer. Please try downloading the PDF instead.');
                    }}
                    onLoad={() => console.log('PDF loaded successfully in Excel tab')}
                  />
                ) : inspectionType === 'fire_extinguisher' ||
                  inspectionType === 'first_aid' ||
                  inspectionType === 'hse' ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex items-start gap-3">
                      <svg
                        className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="flex-1">
                        <h3 className="font-semibold text-blue-900 mb-2">Loading PDF Preview...</h3>
                        <p className="text-sm text-blue-800 mb-3">
                          Generating PDF preview from template. If this takes too long, you can use
                          the download buttons above or switch to Mobile view.
                        </p>
                        <div className="animate-pulse flex gap-2 mt-4">
                          <div className="h-2 w-2 bg-blue-600 rounded-full" />
                          <div className="h-2 w-2 bg-blue-600 rounded-full animation-delay-200" />
                          <div className="h-2 w-2 bg-blue-600 rounded-full animation-delay-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null
              ) : pdfUrl ? (
                <PDFJSViewer
                  pdfUrl={pdfUrl}
                  viewerPath="/pdf-viewer/web/viewer.html"
                  enablePrint
                  enableDownload
                  showToolbar
                  height="700px"
                  onError={(error) => {
                    console.error('PDF.js viewer error:', error);
                    alert('Error loading PDF viewer. Please try downloading the PDF instead.');
                  }}
                  onLoad={() => console.log('PDF loaded successfully')}
                />
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900 mb-2">Loading PDF Preview...</h3>
                      <p className="text-sm text-blue-800 mb-3">
                        Generating PDF preview from template. If this takes too long, you can use
                        the download buttons above or switch to Excel view.
                      </p>
                      <div className="animate-pulse flex gap-2 mt-4">
                        <div className="h-2 w-2 bg-blue-600 rounded-full" />
                        <div className="h-2 w-2 bg-blue-600 rounded-full animation-delay-200" />
                        <div className="h-2 w-2 bg-blue-600 rounded-full animation-delay-400" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preview Excel */}
          {excelData && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview Excel</h2>
              <ExcelViewer
                excelData={excelData}
                title="Inspection Excel Preview"
                showDownloadButton={false}
                showZoomControls
                height="500px"
                filename={`${inspectionType}_inspection.xlsx`}
                showHeader
              />
            </div>
          )}

          {/* Reviewer Comments */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Review Comments (Optional)</h2>
            <textarea
              value={reviewComments}
              onChange={(e) => setReviewComments(e.target.value)}
              rows={4}
              placeholder="Add any comments or feedback for the inspector..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Supervisor Signature */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Supervisor Signature <span className="text-red-500">*</span>
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Please sign to approve this inspection. Your signature and details will be added to
              the exported documents.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reviewed by: {user?.name}
                </label>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review date: {new Date().toLocaleDateString()}
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Draw your signature below:
                </label>
                <div className="relative">
                  <canvas
                    ref={(canvas) => {
                      if (canvas && !canvas.dataset.initialized) {
                        canvas.dataset.initialized = 'true';
                        setSignatureCanvasRef(canvas);
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                          let isDrawing = false;
                          let lastX = 0;
                          let lastY = 0;

                          canvas.width = canvas.offsetWidth;
                          canvas.height = 150;

                          // Load saved signature if exists
                          if (supervisorSignature) {
                            const img = new Image();
                            img.onload = () => {
                              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                            };
                            img.src = supervisorSignature;
                          }

                          const startDrawing = (e: MouseEvent | TouchEvent) => {
                            isDrawing = true;
                            setHasDrawnSignature(true);
                            const rect = canvas.getBoundingClientRect();
                            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
                            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
                            lastX = clientX - rect.left;
                            lastY = clientY - rect.top;
                          };

                          const draw = (e: MouseEvent | TouchEvent) => {
                            if (!isDrawing) return;
                            e.preventDefault();

                            const rect = canvas.getBoundingClientRect();
                            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
                            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
                            const currentX = clientX - rect.left;
                            const currentY = clientY - rect.top;

                            ctx.strokeStyle = '#000000';
                            ctx.lineWidth = 2;
                            ctx.lineCap = 'round';
                            ctx.lineJoin = 'round';

                            ctx.beginPath();
                            ctx.moveTo(lastX, lastY);
                            ctx.lineTo(currentX, currentY);
                            ctx.stroke();

                            lastX = currentX;
                            lastY = currentY;

                            // Update signature state
                            setSupervisorSignature(canvas.toDataURL());
                          };

                          const stopDrawing = () => {
                            isDrawing = false;
                          };

                          canvas.addEventListener('mousedown', startDrawing);
                          canvas.addEventListener('mousemove', draw);
                          canvas.addEventListener('mouseup', stopDrawing);
                          canvas.addEventListener('mouseout', stopDrawing);

                          canvas.addEventListener('touchstart', startDrawing);
                          canvas.addEventListener('touchmove', draw);
                          canvas.addEventListener('touchend', stopDrawing);
                        }
                      }
                    }}
                    className="w-full border-2 border-gray-300 rounded-lg cursor-crosshair bg-white"
                    style={{ height: '150px', touchAction: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (signatureCanvasRef) {
                        const ctx = signatureCanvasRef.getContext('2d');
                        if (ctx) {
                          ctx.clearRect(0, 0, signatureCanvasRef.width, signatureCanvasRef.height);
                          setSupervisorSignature('');
                          setHasDrawnSignature(false);
                        }
                      }
                    }}
                    className="absolute top-2 right-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                  >
                    Clear
                  </button>
                </div>

                {/* Save signature button - only show if signature was drawn and is different from saved */}
                {hasDrawnSignature && supervisorSignature && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={async () => {
                        if (supervisorSignature) {
                          const success = await updateSignature(supervisorSignature);
                          if (success) {
                            alert(
                              'Signature saved! It will be automatically loaded next time you login.',
                            );
                            setHasDrawnSignature(false);
                          } else {
                            alert('Failed to save signature. Please try again.');
                          }
                        }
                      }}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Save Signature to My Profile
                    </button>
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      Save this signature to automatically use it for future approvals
                    </p>
                  </div>
                )}

                {/* Info message for using saved signature */}
                {!hasDrawnSignature && supervisorSignature && user?.signature && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Using your saved signature. Clear and redraw to use a new signature.
                    </p>
                  </div>
                )}

                {!supervisorSignature && (
                  <p className="text-sm text-red-500 mt-2">Signature is required to approve</p>
                )}
              </div>
            </div>
          </div>

          {/* Digital Signature */}
          {inspection.signature && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Inspector Signature</h2>
              <img
                src={inspection.signature}
                alt="Signature"
                className="border rounded-lg max-w-xs"
              />
            </div>
          )}
        </div>

        {/* Approve Modal */}
        {showApproveModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
              <div
                className="fixed inset-0 transition-opacity"
                onClick={() => setShowApproveModal(false)}
              >
                <div className="absolute inset-0 bg-gray-500 opacity-75" />
              </div>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                      <svg
                        className="h-6 w-6 text-green-600"
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
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Approve Inspection
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Are you sure you want to approve this inspection? This action will:
                        </p>
                        <ul className="mt-2 text-sm text-gray-600 list-disc list-inside space-y-1">
                          <li>Mark the inspection as approved</li>
                          <li>Generate Excel and PDF with your signature</li>
                          <li>Upload both documents to SharePoint</li>
                          <li>Notify the inspector</li>
                          <li>Remove from pending review queue</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    onClick={handleApprove}
                    disabled={processing}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {processing ? 'Processing...' : 'Approve & Export'}
                  </button>
                  <button
                    onClick={() => setShowApproveModal(false)}
                    disabled={processing}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
              <div
                className="fixed inset-0 transition-opacity"
                onClick={() => setShowRejectModal(false)}
              >
                <div className="absolute inset-0 bg-gray-500 opacity-75" />
              </div>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <svg
                        className="h-6 w-6 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                    </div>
                    <div className="mt-3 w-full text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Reject Inspection
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500 mb-3">
                          Please provide a reason for rejection. The inspector will be notified and
                          required to revise and resubmit.
                        </p>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={4}
                          placeholder="Explain what needs to be corrected..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    onClick={handleReject}
                    disabled={processing || !rejectionReason.trim()}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {processing ? 'Processing...' : 'Reject Inspection'}
                  </button>
                  <button
                    onClick={() => setShowRejectModal(false)}
                    disabled={processing}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </SupervisorLayout>
    </ProtectedRoute>
  );
};

export default InspectionReview;
