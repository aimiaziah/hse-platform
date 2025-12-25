import React, { useState, useEffect } from 'react';
import InspectorLayout from '@/roles/inspector/layouts/InspectorLayout';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/router';
import AICameraCapture from '@/components/AICameraCapture';
import {
  AIInspectionResult,
  CapturedImage,
  getConfidenceLevel,
  getConfidenceColor,
} from '@/types/ai-inspection';

type RatingType = '✓' | 'X' | 'NA' | null;

interface FireExtinguisherRow {
  no: number;
  serialNo: string;
  location: string;
  typeSize: string;
  shell: RatingType;
  hose: RatingType;
  nozzle: RatingType;
  pressureGauge: RatingType;
  safetyPin: RatingType;
  pinSeal: RatingType;
  accessible: RatingType;
  missingNotInPlace: RatingType;
  emptyPressureLow: RatingType;
  servicingTags: RatingType;
  expiryDate: string;
  remarks: string;
  aiScanned?: boolean;
  aiConfidence?: { [field: string]: number };
  aiCapturedImages?: CapturedImage[];
}

interface ChecklistData {
  id: string;
  inspectedBy: string;
  inspectionDate: string;
  designation: string;
  signature: string;
  extinguishers: FireExtinguisherRow[];
  status: 'draft' | 'completed';
  createdAt: string;
}

const INITIAL_EXTINGUISHERS: FireExtinguisherRow[] = [
  {
    no: 1,
    serialNo: 'FF022018Y002311',
    location: 'Ground Floor',
    typeSize: '9',
    shell: null,
    hose: null,
    nozzle: null,
    pressureGauge: null,
    safetyPin: null,
    pinSeal: null,
    accessible: null,
    missingNotInPlace: null,
    emptyPressureLow: null,
    servicingTags: null,
    expiryDate: '',
    remarks: '',
  },
  {
    no: 2,
    serialNo: 'FF022018Y002640',
    location: 'Ground Floor',
    typeSize: '9',
    shell: null,
    hose: null,
    nozzle: null,
    pressureGauge: null,
    safetyPin: null,
    pinSeal: null,
    accessible: null,
    missingNotInPlace: null,
    emptyPressureLow: null,
    servicingTags: null,
    expiryDate: '',
    remarks: '',
  },
  {
    no: 3,
    serialNo: 'FF022018Y002996',
    location: 'Ground Floor',
    typeSize: '9',
    shell: null,
    hose: null,
    nozzle: null,
    pressureGauge: null,
    safetyPin: null,
    pinSeal: null,
    accessible: null,
    missingNotInPlace: null,
    emptyPressureLow: null,
    servicingTags: null,
    expiryDate: '',
    remarks: '',
  },
  {
    no: 4,
    serialNo: 'FF022018Y002646',
    location: 'Ground Floor',
    typeSize: '9',
    shell: null,
    hose: null,
    nozzle: null,
    pressureGauge: null,
    safetyPin: null,
    pinSeal: null,
    accessible: null,
    missingNotInPlace: null,
    emptyPressureLow: null,
    servicingTags: null,
    expiryDate: '',
    remarks: '',
  },
  {
    no: 5,
    serialNo: 'SR092021Y176423',
    location: 'Ground Floor',
    typeSize: '9',
    shell: null,
    hose: null,
    nozzle: null,
    pressureGauge: null,
    safetyPin: null,
    pinSeal: null,
    accessible: null,
    missingNotInPlace: null,
    emptyPressureLow: null,
    servicingTags: null,
    expiryDate: '',
    remarks: '',
  },
  {
    no: 6,
    serialNo: 'SR092021Y176466',
    location: 'Ground Floor',
    typeSize: '9',
    shell: null,
    hose: null,
    nozzle: null,
    pressureGauge: null,
    safetyPin: null,
    pinSeal: null,
    accessible: null,
    missingNotInPlace: null,
    emptyPressureLow: null,
    servicingTags: null,
    expiryDate: '',
    remarks: '',
  },
  {
    no: 7,
    serialNo: 'FF022018Y002904',
    location: 'Ground Floor',
    typeSize: '9',
    shell: null,
    hose: null,
    nozzle: null,
    pressureGauge: null,
    safetyPin: null,
    pinSeal: null,
    accessible: null,
    missingNotInPlace: null,
    emptyPressureLow: null,
    servicingTags: null,
    expiryDate: '',
    remarks: '',
  },
  {
    no: 8,
    serialNo: 'FF022018Y002555',
    location: 'Ground Floor',
    typeSize: '9',
    shell: null,
    hose: null,
    nozzle: null,
    pressureGauge: null,
    safetyPin: null,
    pinSeal: null,
    accessible: null,
    missingNotInPlace: null,
    emptyPressureLow: null,
    servicingTags: null,
    expiryDate: '',
    remarks: '',
  },
  {
    no: 9,
    serialNo: 'FF022018Y002990',
    location: 'Ground Floor',
    typeSize: '9',
    shell: null,
    hose: null,
    nozzle: null,
    pressureGauge: null,
    safetyPin: null,
    pinSeal: null,
    accessible: null,
    missingNotInPlace: null,
    emptyPressureLow: null,
    servicingTags: null,
    expiryDate: '',
    remarks: '',
  },
  {
    no: 10,
    serialNo: 'SR092021Y176428',
    location: 'Ground Floor',
    typeSize: '9',
    shell: null,
    hose: null,
    nozzle: null,
    pressureGauge: null,
    safetyPin: null,
    pinSeal: null,
    accessible: null,
    missingNotInPlace: null,
    emptyPressureLow: null,
    servicingTags: null,
    expiryDate: '',
    remarks: '',
  },
  {
    no: 11,
    serialNo: 'SR092021Y176462',
    location: 'Level 1',
    typeSize: '9',
    shell: null,
    hose: null,
    nozzle: null,
    pressureGauge: null,
    safetyPin: null,
    pinSeal: null,
    accessible: null,
    missingNotInPlace: null,
    emptyPressureLow: null,
    servicingTags: null,
    expiryDate: '',
    remarks: '',
  },
  {
    no: 12,
    serialNo: 'FM072018Y213348',
    location: 'Level 1',
    typeSize: '9',
    shell: null,
    hose: null,
    nozzle: null,
    pressureGauge: null,
    safetyPin: null,
    pinSeal: null,
    accessible: null,
    missingNotInPlace: null,
    emptyPressureLow: null,
    servicingTags: null,
    expiryDate: '',
    remarks: '',
  },
  {
    no: 13,
    serialNo: 'FF022018Y002932',
    location: 'Level 1',
    typeSize: '9',
    shell: null,
    hose: null,
    nozzle: null,
    pressureGauge: null,
    safetyPin: null,
    pinSeal: null,
    accessible: null,
    missingNotInPlace: null,
    emptyPressureLow: null,
    servicingTags: null,
    expiryDate: '',
    remarks: '',
  },
  {
    no: 14,
    serialNo: 'FM072018Y213025',
    location: 'Level 1',
    typeSize: '9',
    shell: null,
    hose: null,
    nozzle: null,
    pressureGauge: null,
    safetyPin: null,
    pinSeal: null,
    accessible: null,
    missingNotInPlace: null,
    emptyPressureLow: null,
    servicingTags: null,
    expiryDate: '',
    remarks: '',
  },
  {
    no: 15,
    serialNo: 'FR092021Y176410',
    location: 'Level 1',
    typeSize: '9',
    shell: null,
    hose: null,
    nozzle: null,
    pressureGauge: null,
    safetyPin: null,
    pinSeal: null,
    accessible: null,
    missingNotInPlace: null,
    emptyPressureLow: null,
    servicingTags: null,
    expiryDate: '',
    remarks: '',
  },
  {
    no: 16,
    serialNo: 'SR092021Y176461',
    location: 'Level 1',
    typeSize: '9',
    shell: null,
    hose: null,
    nozzle: null,
    pressureGauge: null,
    safetyPin: null,
    pinSeal: null,
    accessible: null,
    missingNotInPlace: null,
    emptyPressureLow: null,
    servicingTags: null,
    expiryDate: '',
    remarks: '',
  },
  {
    no: 17,
    serialNo: 'SR092021Y176458',
    location: 'Level 1',
    typeSize: '9',
    shell: null,
    hose: null,
    nozzle: null,
    pressureGauge: null,
    safetyPin: null,
    pinSeal: null,
    accessible: null,
    missingNotInPlace: null,
    emptyPressureLow: null,
    servicingTags: null,
    expiryDate: '',
    remarks: '',
  },
  {
    no: 18,
    serialNo: 'FF022018Y002550',
    location: 'Level 2',
    typeSize: '9',
    shell: null,
    hose: null,
    nozzle: null,
    pressureGauge: null,
    safetyPin: null,
    pinSeal: null,
    accessible: null,
    missingNotInPlace: null,
    emptyPressureLow: null,
    servicingTags: null,
    expiryDate: '',
    remarks: '',
  },
  {
    no: 19,
    serialNo: 'FF022018Y002513',
    location: 'Level 2',
    typeSize: '9',
    shell: null,
    hose: null,
    nozzle: null,
    pressureGauge: null,
    safetyPin: null,
    pinSeal: null,
    accessible: null,
    missingNotInPlace: null,
    emptyPressureLow: null,
    servicingTags: null,
    expiryDate: '',
    remarks: '',
  },
  {
    no: 20,
    serialNo: 'SR092021Y176225',
    location: 'Level 2',
    typeSize: '9',
    shell: null,
    hose: null,
    nozzle: null,
    pressureGauge: null,
    safetyPin: null,
    pinSeal: null,
    accessible: null,
    missingNotInPlace: null,
    emptyPressureLow: null,
    servicingTags: null,
    expiryDate: '',
    remarks: '',
  },
  {
    no: 21,
    serialNo: 'FM072018Y213392',
    location: 'Level 2',
    typeSize: '9',
    shell: null,
    hose: null,
    nozzle: null,
    pressureGauge: null,
    safetyPin: null,
    pinSeal: null,
    accessible: null,
    missingNotInPlace: null,
    emptyPressureLow: null,
    servicingTags: null,
    expiryDate: '',
    remarks: '',
  },
  {
    no: 22,
    serialNo: 'SR092021Y1776570',
    location: 'Level 2',
    typeSize: '9',
    shell: null,
    hose: null,
    nozzle: null,
    pressureGauge: null,
    safetyPin: null,
    pinSeal: null,
    accessible: null,
    missingNotInPlace: null,
    emptyPressureLow: null,
    servicingTags: null,
    expiryDate: '',
    remarks: '',
  },
  {
    no: 23,
    serialNo: 'SR092021Y1762000',
    location: 'Level 2',
    typeSize: '9',
    shell: null,
    hose: null,
    nozzle: null,
    pressureGauge: null,
    safetyPin: null,
    pinSeal: null,
    accessible: null,
    missingNotInPlace: null,
    emptyPressureLow: null,
    servicingTags: null,
    expiryDate: '',
    remarks: '',
  },
  {
    no: 24,
    serialNo: 'SR092021Y176436',
    location: 'Level 3',
    typeSize: '9',
    shell: null,
    hose: null,
    nozzle: null,
    pressureGauge: null,
    safetyPin: null,
    pinSeal: null,
    accessible: null,
    missingNotInPlace: null,
    emptyPressureLow: null,
    servicingTags: null,
    expiryDate: '',
    remarks: '',
  },
];

const FireExtinguisherChecklist: React.FC = () => {
  const { hasPermission, user } = useAuth();
  const router = useRouter();
  const [checklistData, setChecklistData] = useState<ChecklistData>({
    id: Date.now().toString(),
    inspectedBy: user?.name || '',
    inspectionDate: new Date().toISOString().split('T')[0],
    designation: user?.role || 'HSE',
    signature: '',
    extinguishers: INITIAL_EXTINGUISHERS,
    status: 'draft',
    createdAt: new Date().toISOString(),
  });
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [showAIScanner, setShowAIScanner] = useState(false);
  const [scanningExtinguisherIndex, setScanningExtinguisherIndex] = useState<number | null>(null);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [showAIResults, setShowAIResults] = useState(false);
  const [currentAIResults, setCurrentAIResults] = useState<AIInspectionResult | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!hasPermission('canCreateInspections')) {
      router.push('/');
    }
  }, [hasPermission, router]);

  // Load templates from database
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoadingTemplates(true);
        const response = await fetch(
          '/api/admin/inspection-item-templates?template_type=fire_extinguisher&item_type=extinguisher&is_active=true',
        );
        const result = await response.json();
        if (result.success && result.data && result.data.length > 0) {
          // Convert database templates to FireExtinguisherRow format
          const templates = result.data.map((t: any) => ({
            no: t.item_no || 0,
            serialNo: t.serial_no || '',
            location: t.location || '',
            typeSize: t.type_size || '',
            shell: null,
            hose: null,
            nozzle: null,
            pressureGauge: null,
            safetyPin: null,
            pinSeal: null,
            accessible: null,
            missingNotInPlace: null,
            emptyPressureLow: null,
            servicingTags: null,
            expiryDate: '',
            remarks: '',
          }));
          setChecklistData((prev) => ({
            ...prev,
            extinguishers: templates,
          }));
        } else {
          // Fallback to INITIAL_EXTINGUISHERS if no templates found
          console.warn('[Fire Extinguisher] No templates found, using defaults');
        }
      } catch (error) {
        console.error('[Fire Extinguisher] Error loading templates:', error);
        // Fallback to INITIAL_EXTINGUISHERS on error
      } finally {
        setLoadingTemplates(false);
      }
    };
    loadTemplates();
  }, []);

  // Load existing draft if available
  useEffect(() => {
    if (loadingTemplates) return; // Wait for templates to load first
    try {
      const drafts = JSON.parse(localStorage.getItem('fire-extinguisher-drafts') || '[]');
      if (drafts.length > 0) {
        // Load the most recent draft
        const latestDraft = drafts[drafts.length - 1];
        setChecklistData(latestDraft);
        console.log('[Fire Extinguisher] Loaded draft:', latestDraft.id);
      }
    } catch (error) {
      console.error('[Fire Extinguisher] Error loading draft:', error);
    }
  }, [loadingTemplates]);

  if (!hasPermission('canCreateInspections')) {
    return null;
  }

  if (loadingTemplates) {
    return (
      <InspectorLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading templates...</p>
          </div>
        </div>
      </InspectorLayout>
    );
  }

  const updateField = (field: keyof ChecklistData, value: any) => {
    setChecklistData((prev) => ({ ...prev, [field]: value }));
  };

  const updateExtinguisher = (index: number, field: keyof FireExtinguisherRow, value: any) => {
    setChecklistData((prev) => ({
      ...prev,
      extinguishers: prev.extinguishers.map((ext, i) =>
        i === index ? { ...ext, [field]: value } : ext,
      ),
    }));
  };

  const checkExpiryDate = (expiryDate: string) => {
    if (!expiryDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return { type: 'expired', days: Math.abs(diffDays) };
    }
    if (diffDays <= 30) {
      return { type: 'warning', days: diffDays };
    }
    return { type: 'valid', days: diffDays };
  };

  const getExpirySummary = () => {
    let expired = 0;
    let expiringSoon = 0;
    checklistData.extinguishers.forEach((ext) => {
      const status = checkExpiryDate(ext.expiryDate);
      if (status?.type === 'expired') expired++;
      else if (status?.type === 'warning') expiringSoon++;
    });
    return { expired, expiringSoon };
  };

  const startAIScanning = (index: number) => {
    setScanningExtinguisherIndex(index);
    setShowAIScanner(true);
  };

  const handleAICaptureComplete = async (images: CapturedImage[]) => {
    if (scanningExtinguisherIndex === null) return;
    setShowAIScanner(false);
    setIsProcessingAI(true);
    try {
      const extinguisher = checklistData.extinguishers[scanningExtinguisherIndex];
      const response = await fetch('/api/ai/analyze-extinguisher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images,
          extinguisherInfo: {
            serialNo: extinguisher.serialNo,
            location: extinguisher.location,
            typeSize: extinguisher.typeSize,
          },
        }),
      });
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const result: AIInspectionResult = await response.json();
      if (result.success) {
        if (result.detections.length > 0) {
          applyAIResults(scanningExtinguisherIndex, result, images);
          setCurrentAIResults(result);
          setShowAIResults(true);
        } else {
          setAiErrorMessage('Please take a picture of a fire extinguisher');
        }
      } else {
        // Check if error is specifically about not being a fire extinguisher
        if (result.error === 'NOT_FIRE_EXTINGUISHER') {
          setAiErrorMessage('Please take a picture of a fire extinguisher');
        } else {
          setAiErrorMessage('AI analysis failed. Please try again or fill the form manually');
        }
      }
    } catch (error) {
      setAiErrorMessage('Failed to process image. Please try again or fill the form manually');
    } finally {
      setIsProcessingAI(false);
    }
  };

  const applyAIResults = (index: number, result: AIInspectionResult, images: CapturedImage[]) => {
    const updatedExtinguisher: Partial<FireExtinguisherRow> = {
      aiScanned: true,
      aiCapturedImages: images,
      aiConfidence: {},
    };
    result.detections.forEach((detection) => {
      const fieldMap: { [key: string]: keyof FireExtinguisherRow } = {
        shell: 'shell',
        hose: 'hose',
        nozzle: 'nozzle',
        pressureGauge: 'pressureGauge',
        safetyPin: 'safetyPin',
        pinSeal: 'pinSeal',
        accessible: 'accessible',
        missingNotInPlace: 'missingNotInPlace',
        emptyPressureLow: 'emptyPressureLow',
        servicingTags: 'servicingTags',
      };
      const fieldKey = fieldMap[detection.field];
      if (fieldKey) {
        (updatedExtinguisher as any)[fieldKey] = detection.value;
        if (updatedExtinguisher.aiConfidence) {
          updatedExtinguisher.aiConfidence[detection.field] = detection.confidence;
        }
      }
    });
    if (result.extractedData.expiryDate) {
      updatedExtinguisher.expiryDate = result.extractedData.expiryDate.value;
      if (updatedExtinguisher.aiConfidence) {
        updatedExtinguisher.aiConfidence.expiryDate = result.extractedData.expiryDate.confidence;
      }
    }
    setChecklistData((prev) => ({
      ...prev,
      extinguishers: prev.extinguishers.map((ext, i) =>
        i === index ? { ...ext, ...updatedExtinguisher } : ext,
      ),
    }));
  };

  const handleAICaptureCancel = () => {
    setShowAIScanner(false);
    setScanningExtinguisherIndex(null);
  };

  const handleSaveDraft = () => {
    try {
      const drafts = JSON.parse(localStorage.getItem('fire-extinguisher-drafts') || '[]');
      const existingIndex = drafts.findIndex((d: ChecklistData) => d.id === checklistData.id);
      if (existingIndex >= 0) {
        drafts[existingIndex] = checklistData;
      } else {
        drafts.push(checklistData);
      }
      localStorage.setItem('fire-extinguisher-drafts', JSON.stringify(drafts));
      alert('Draft saved successfully!');
    } catch (error) {
      alert('Failed to save draft');
    }
  };

  const handleSubmit = async () => {
    try {
      console.log('[Fire Extinguisher] Starting submission...', {
        inspectedBy: checklistData.inspectedBy,
        inspectionDate: checklistData.inspectionDate,
        extinguishersCount: checklistData.extinguishers.length,
      });

      // Submit to Supabase
      const response = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formType: 'fire_extinguisher',
          status: 'pending_review',
          data: {
            inspectedBy: checklistData.inspectedBy,
            inspectionDate: checklistData.inspectionDate,
            designation: checklistData.designation,
            signature: checklistData.signature,
            extinguishers: checklistData.extinguishers,
            company: 'Theta Edge Berhad',
            location: 'All Locations',
          },
          signature: {
            dataUrl: checklistData.signature,
            timestamp: new Date().toISOString(),
            inspectorId: user?.id || '',
            inspectorName: checklistData.inspectedBy,
          },
        }),
      });

      console.log('[Fire Extinguisher] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[Fire Extinguisher] Submission failed:', errorData);
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const result = await response.json();
      console.log('[Fire Extinguisher] Submission successful:', result);

      // Remove from drafts after successful submission
      const drafts = JSON.parse(localStorage.getItem('fire-extinguisher-drafts') || '[]');
      const updatedDrafts = drafts.filter((d: ChecklistData) => d.id !== checklistData.id);
      localStorage.setItem('fire-extinguisher-drafts', JSON.stringify(updatedDrafts));

      setShowSubmitDialog(false);

      // Show success message with inspection number
      const inspectionNumber = result.inspection?.inspection_number || 'N/A';
      alert(
        `✅ Fire Extinguisher Checklist submitted successfully!\n\nInspection #${inspectionNumber}\n\nYou can now view it in the History page.`,
      );

      router.push('/inspector/forms');
    } catch (error) {
      console.error('[Fire Extinguisher] Submit error:', error);

      // Show detailed error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(
        `❌ Failed to submit checklist\n\nError: ${errorMessage}\n\nPlease check your internet connection and try again. If the problem persists, contact support.`,
      );
    }
  };

  const getCompletionStatus = (ext: FireExtinguisherRow) => {
    const fields: (keyof FireExtinguisherRow)[] = [
      'shell',
      'hose',
      'nozzle',
      'pressureGauge',
      'safetyPin',
      'pinSeal',
      'accessible',
      'missingNotInPlace',
      'emptyPressureLow',
      'servicingTags',
    ];
    const completedFields = fields.filter((field) => ext[field] !== null).length;
    return { completed: completedFields, total: fields.length };
  };

  const RatingButton: React.FC<{
    value: RatingType;
    current: RatingType;
    onChange: () => void;
  }> = ({ value, current, onChange }) => {
    const isSelected = current === value;
    let bgColor = 'bg-gray-100 hover:bg-gray-200 border-gray-300';
    let textColor = 'text-gray-800';
    if (isSelected) {
      if (value === '✓') (bgColor = 'bg-green-600 border-green-600'), (textColor = 'text-white');
      else if (value === 'X') (bgColor = 'bg-red-600 border-red-600'), (textColor = 'text-white');
      else (bgColor = 'bg-blue-600 border-blue-600'), (textColor = 'text-white');
    }
    return (
      <button
        onClick={onChange}
        className={`px-3 py-1.5 text-xs font-medium border rounded-md ${bgColor} ${textColor} transition-colors`}
      >
        {value}
      </button>
    );
  };

  return (
    <ProtectedRoute requiredPermission="canCreateInspections">
      <InspectorLayout>
        <div className="min-h-screen bg-gray-50 pb-20">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10 shadow-sm">
            <button
              onClick={() => router.push('/inspector/forms')}
              className="mb-2 text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Dashboard
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Fire Extinguisher Checklist</h1>
              <p className="text-gray-500 text-xs">HSEP-08/FEC(F)/RV00-017</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto p-4 space-y-6">
            {/* Section 1: General Information */}
            <div className="bg-white rounded-lg p-6 space-y-4 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                Section 1: General Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Company: Theta Edge Berhad</p>
                    <p className="text-gray-600 text-xs mt-1">
                      Lot 11B, Jalan 223, Seksyen 51A,
                      <br />
                      46100 Petaling Jaya, Selangor, Malaysia.
                      <br />
                      +60 36043 0000
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Inspected by *
                    </label>
                    <input
                      type="text"
                      value={checklistData.inspectedBy}
                      onChange={(e) => updateField('inspectedBy', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date of Inspection *
                    </label>
                    <input
                      type="date"
                      value={checklistData.inspectionDate}
                      onChange={(e) => updateField('inspectionDate', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Designation *
                    </label>
                    <input
                      type="text"
                      value={checklistData.designation}
                      onChange={(e) => updateField('designation', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., HSE"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Expiry Summary Banner */}
            {(() => {
              const summary = getExpirySummary();
              if (summary.expired > 0 || summary.expiringSoon > 0) {
                return (
                  <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-red-500">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-6 w-6 text-red-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-gray-900 mb-1">Expiry Date Alerts</h3>
                        <div className="space-y-1">
                          {summary.expired > 0 && (
                            <p className="text-sm text-red-700">
                              <span className="font-semibold">{summary.expired}</span> fire
                              extinguisher{summary.expired > 1 ? 's have' : ' has'} expired
                            </p>
                          )}
                          {summary.expiringSoon > 0 && (
                            <p className="text-sm text-yellow-700">
                              <span className="font-semibold">{summary.expiringSoon}</span> fire
                              extinguisher{summary.expiringSoon > 1 ? 's are' : ' is'} expiring
                              within 30 days
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          Please review and update expired or expiring items immediately
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Section 2: Inspection Details */}
            <div className="bg-white rounded-lg p-6 space-y-4 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                Section 2: Inspection Details
              </h2>
              <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 mb-6">
                <p className="text-sm font-medium text-blue-800 mb-2">LEGEND:</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <span className="text-green-600 font-bold">✓</span> = OK / Good Condition
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-red-600 font-bold">X</span> = Not in good condition
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-blue-600 font-bold">NA</span> = Not Applicable
                  </span>
                </div>
              </div>

              {/* Mobile View: Card Layout */}
              <div className="block lg:hidden space-y-4">
                {checklistData.extinguishers.map((ext, index) => {
                  const status = getCompletionStatus(ext);
                  const isExpanded = expandedRow === index;
                  return (
                    <div
                      key={index}
                      className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm"
                    >
                      <div
                        onClick={() => setExpandedRow(isExpanded ? null : index)}
                        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="rounded-md border border-blue-600 text-blue-600 px-2 py-0.5 text-xs font-medium">
                                #{ext.no}
                              </span>
                              {status.completed === status.total && (
                                <span className="text-xs text-green-600 flex items-center gap-1">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-3 w-3"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  Complete
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium text-gray-800">{ext.serialNo}</p>
                            <p className="text-sm text-gray-600">{ext.location}</p>
                            <div className="mt-2 flex items-center gap-2">
                              <div className="rounded-md border border-blue-600 text-blue-600 px-2 py-0.5 text-xs font-medium">
                                {status.completed}/{status.total} items
                              </div>
                              <span className="text-xs text-gray-600">Type: {ext.typeSize} kg</span>
                            </div>
                          </div>
                          <span className="text-gray-600">{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="p-4 space-y-3">
                          <button
                            onClick={() => startAIScanning(index)}
                            className="w-full rounded-md bg-blue-600 text-white py-2 px-4 font-medium hover:bg-blue-700 transition-all"
                          >
                            {ext.aiScanned ? 'Re-scan with AI' : 'Scan with AI'}
                          </button>
                          {ext.aiScanned && (
                            <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                              <p className="text-xs text-blue-800 font-medium">AI Scanned</p>
                              <p className="text-xs text-gray-600">
                                {Object.keys(ext.aiConfidence || {}).length} fields auto-filled.
                                Review and adjust as needed.
                              </p>
                            </div>
                          )}
                          {[
                            { field: 'shell', label: 'Shell' },
                            { field: 'hose', label: 'Hose' },
                            { field: 'nozzle', label: 'Nozzle' },
                            { field: 'pressureGauge', label: 'Pressure Gauge' },
                            { field: 'safetyPin', label: 'Safety Pin (Missing?)' },
                            { field: 'pinSeal', label: 'Pin Seal Broken/Missing?' },
                            { field: 'accessible', label: 'Accessible (not obstructed)' },
                            { field: 'missingNotInPlace', label: 'Missing / Not in Place' },
                            { field: 'emptyPressureLow', label: 'Empty / Pressure Low' },
                            { field: 'servicingTags', label: 'Servicing / Tags in Place' },
                          ].map(({ field, label }) => {
                            const confidence = ext.aiConfidence?.[field];
                            return (
                              <div
                                key={field}
                                className="bg-white rounded-md border border-gray-200 p-3"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs font-medium text-gray-800">{label}</p>
                                  {confidence !== undefined && (
                                    <span className="text-[10px] text-gray-600">
                                      AI: {Math.round(confidence * 100)}%
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <RatingButton
                                    value="✓"
                                    current={ext[field as keyof FireExtinguisherRow] as RatingType}
                                    onChange={() =>
                                      updateExtinguisher(
                                        index,
                                        field as keyof FireExtinguisherRow,
                                        '✓',
                                      )
                                    }
                                  />
                                  <RatingButton
                                    value="X"
                                    current={ext[field as keyof FireExtinguisherRow] as RatingType}
                                    onChange={() =>
                                      updateExtinguisher(
                                        index,
                                        field as keyof FireExtinguisherRow,
                                        'X',
                                      )
                                    }
                                  />
                                  <RatingButton
                                    value="NA"
                                    current={ext[field as keyof FireExtinguisherRow] as RatingType}
                                    onChange={() =>
                                      updateExtinguisher(
                                        index,
                                        field as keyof FireExtinguisherRow,
                                        'NA',
                                      )
                                    }
                                  />
                                </div>
                              </div>
                            );
                          })}
                          <div className="bg-white rounded-md border border-gray-200 p-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Expiry Date
                            </label>
                            <input
                              type="date"
                              value={ext.expiryDate}
                              onChange={(e) =>
                                updateExtinguisher(index, 'expiryDate', e.target.value)
                              }
                              className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 text-sm ${
                                checkExpiryDate(ext.expiryDate)?.type === 'expired'
                                  ? 'border-red-500 bg-red-50 focus:ring-red-500'
                                  : checkExpiryDate(ext.expiryDate)?.type === 'warning'
                                  ? 'border-yellow-500 bg-yellow-50 focus:ring-yellow-500'
                                  : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
                              }`}
                            />
                            {ext.expiryDate && checkExpiryDate(ext.expiryDate) && (
                              <div
                                className={`mt-2 p-2 rounded-md border flex items-start gap-2 ${
                                  checkExpiryDate(ext.expiryDate)?.type === 'expired'
                                    ? 'bg-red-50 border-red-200'
                                    : checkExpiryDate(ext.expiryDate)?.type === 'warning'
                                    ? 'bg-yellow-50 border-yellow-200'
                                    : 'bg-green-50 border-green-200'
                                }`}
                              >
                                <span className="flex-shrink-0 text-lg">
                                  {checkExpiryDate(ext.expiryDate)?.type === 'expired'
                                    ? '⚠️'
                                    : checkExpiryDate(ext.expiryDate)?.type === 'warning'
                                    ? '⏰'
                                    : '✅'}
                                </span>
                                <div className="flex-1">
                                  <p
                                    className={`text-xs font-semibold ${
                                      checkExpiryDate(ext.expiryDate)?.type === 'expired'
                                        ? 'text-red-800'
                                        : checkExpiryDate(ext.expiryDate)?.type === 'warning'
                                        ? 'text-yellow-800'
                                        : 'text-green-800'
                                    }`}
                                  >
                                    {checkExpiryDate(ext.expiryDate)?.type === 'expired'
                                      ? `EXPIRED ${checkExpiryDate(ext.expiryDate)?.days} days ago`
                                      : checkExpiryDate(ext.expiryDate)?.type === 'warning'
                                      ? `Expiring in ${checkExpiryDate(ext.expiryDate)?.days} days`
                                      : `Valid (${
                                          checkExpiryDate(ext.expiryDate)?.days
                                        } days remaining)`}
                                  </p>
                                  {checkExpiryDate(ext.expiryDate)?.type !== 'valid' && (
                                    <p className="text-xs text-gray-600 mt-1">
                                      {checkExpiryDate(ext.expiryDate)?.type === 'expired'
                                        ? 'This extinguisher requires immediate attention'
                                        : 'Schedule servicing soon'}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="bg-white rounded-md border border-gray-200 p-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Remarks
                            </label>
                            <textarea
                              value={ext.remarks}
                              onChange={(e) => updateExtinguisher(index, 'remarks', e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              placeholder="Any issues or notes..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop View: Table Layout */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="border border-gray-200 px-3 py-3 text-center sticky left-0 bg-blue-600">
                        No
                      </th>
                      <th className="border border-gray-200 px-3 py-3 text-left min-w-[140px]">
                        Serial No
                      </th>
                      <th className="border border-gray-200 px-3 py-3 text-left min-w-[100px]">
                        Location
                      </th>
                      <th className="border border-gray-200 px-3 py-3 text-center">
                        Type/Size (kg)
                      </th>
                      <th className="border border-gray-200 px-3 py-3 text-center min-w-[100px]">
                        AI Scan
                      </th>
                      <th className="border border-gray-200 px-3 py-3 text-center min-w-[60px]">
                        Shell
                      </th>
                      <th className="border border-gray-200 px-3 py-3 text-center min-w-[60px]">
                        Hose
                      </th>
                      <th className="border border-gray-200 px-3 py-3 text-center min-w-[60px]">
                        Nozzle
                      </th>
                      <th className="border border-gray-200 px-3 py-3 text-center min-w-[80px]">
                        Pressure Gauge
                      </th>
                      <th className="border border-gray-200 px-3 py-3 text-center min-w-[80px]">
                        Safety Pin
                      </th>
                      <th className="border border-gray-200 px-3 py-3 text-center min-w-[80px]">
                        Pin Seal
                      </th>
                      <th className="border border-gray-200 px-3 py-3 text-center min-w-[80px]">
                        Accessible
                      </th>
                      <th className="border border-gray-200 px-3 py-3 text-center min-w-[80px]">
                        Missing
                      </th>
                      <th className="border border-gray-200 px-3 py-3 text-center min-w-[80px]">
                        Empty/Low
                      </th>
                      <th className="border border-gray-200 px-3 py-3 text-center min-w-[90px]">
                        Servicing/Tags
                      </th>
                      <th className="border border-gray-200 px-3 py-3 text-center min-w-[120px]">
                        Expiry Date
                      </th>
                      <th className="border border-gray-200 px-3 py-3 text-left min-w-[150px]">
                        Remarks
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {checklistData.extinguishers.map((ext, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-3 py-2 text-center font-medium sticky left-0 bg-white">
                          {ext.no}
                        </td>
                        <td className="border border-gray-200 px-3 py-2">{ext.serialNo}</td>
                        <td className="border border-gray-200 px-3 py-2">{ext.location}</td>
                        <td className="border border-gray-200 px-3 py-2 text-center">
                          {ext.typeSize}
                        </td>
                        <td className="border border-gray-200 px-3 py-2">
                          <button
                            onClick={() => startAIScanning(index)}
                            className="w-full rounded-md bg-blue-600 text-white px-3 py-1.5 font-medium hover:bg-blue-700 transition-all text-xs"
                          >
                            {ext.aiScanned ? 'Re-scan' : 'Scan'}
                          </button>
                        </td>
                        {[
                          'shell',
                          'hose',
                          'nozzle',
                          'pressureGauge',
                          'safetyPin',
                          'pinSeal',
                          'accessible',
                          'missingNotInPlace',
                          'emptyPressureLow',
                          'servicingTags',
                        ].map((field) => (
                          <td key={field} className="border border-gray-200 px-2 py-2">
                            <div className="flex gap-1 justify-center">
                              <RatingButton
                                value="✓"
                                current={ext[field as keyof FireExtinguisherRow] as RatingType}
                                onChange={() =>
                                  updateExtinguisher(index, field as keyof FireExtinguisherRow, '✓')
                                }
                              />
                              <RatingButton
                                value="X"
                                current={ext[field as keyof FireExtinguisherRow] as RatingType}
                                onChange={() =>
                                  updateExtinguisher(index, field as keyof FireExtinguisherRow, 'X')
                                }
                              />
                              <RatingButton
                                value="NA"
                                current={ext[field as keyof FireExtinguisherRow] as RatingType}
                                onChange={() =>
                                  updateExtinguisher(
                                    index,
                                    field as keyof FireExtinguisherRow,
                                    'NA',
                                  )
                                }
                              />
                            </div>
                          </td>
                        ))}
                        <td className="border border-gray-200 px-3 py-2">
                          <div className="space-y-1">
                            <input
                              type="date"
                              value={ext.expiryDate}
                              onChange={(e) =>
                                updateExtinguisher(index, 'expiryDate', e.target.value)
                              }
                              className={`w-full px-2 py-1 rounded-md border focus:outline-none focus:ring-2 text-xs ${
                                checkExpiryDate(ext.expiryDate)?.type === 'expired'
                                  ? 'border-red-500 bg-red-50 focus:ring-red-500'
                                  : checkExpiryDate(ext.expiryDate)?.type === 'warning'
                                  ? 'border-yellow-500 bg-yellow-50 focus:ring-yellow-500'
                                  : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
                              }`}
                            />
                            {ext.expiryDate &&
                              checkExpiryDate(ext.expiryDate)?.type !== 'valid' && (
                                <div
                                  className={`text-[10px] font-semibold flex items-center gap-1 ${
                                    checkExpiryDate(ext.expiryDate)?.type === 'expired'
                                      ? 'text-red-700'
                                      : 'text-yellow-700'
                                  }`}
                                >
                                  <span>
                                    {checkExpiryDate(ext.expiryDate)?.type === 'expired' ? '' : ''}
                                  </span>
                                  <span>
                                    {checkExpiryDate(ext.expiryDate)?.type === 'expired'
                                      ? `Expired ${checkExpiryDate(ext.expiryDate)?.days}d ago`
                                      : `${checkExpiryDate(ext.expiryDate)?.days}d left`}
                                  </span>
                                </div>
                              )}
                          </div>
                        </td>
                        <td className="border border-gray-200 px-3 py-2">
                          <input
                            type="text"
                            value={ext.remarks}
                            onChange={(e) => updateExtinguisher(index, 'remarks', e.target.value)}
                            className="w-full px-2 py-1 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                            placeholder="Notes..."
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSaveDraft}
                className="flex-1 rounded-md border border-gray-300 text-gray-700 py-3 font-medium hover:bg-gray-50 transition-all"
              >
                Save as Draft
              </button>
              {/* <button
                onClick={() => setShowExportDialog(true)}
                className="flex-1 rounded-md border border-gray-300 text-gray-700 py-3 font-medium hover:bg-gray-50 transition-all"
              >
                Export Documents
              </button> */}
              <button
                onClick={() => setShowSubmitDialog(true)}
                className="flex-1 rounded-md bg-blue-600 text-white py-3 font-medium hover:bg-blue-700 transition-all"
              >
                Submit Checklist
              </button>
            </div>
          </div>

          {/* Export Dialog */}
          {showExportDialog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-md w-full shadow-lg">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Export with Template</h3>
                <p className="text-gray-600 mb-6">Choose your export format:</p>
                <div className="space-y-3">
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/export/fire-extinguisher-template', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            inspectedBy: checklistData.inspectedBy,
                            inspectionDate: checklistData.inspectionDate,
                            designation: checklistData.designation,
                            signature: checklistData.signature,
                            extinguishers: checklistData.extinguishers,
                            format: 'pdf',
                          }),
                        });
                        if (!response.ok) throw new Error('Export failed');
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        const filename = `Fire_Extinguisher_Checklist_${
                          new Date().toISOString().split('T')[0]
                        }.pdf`;
                        link.download = filename;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                        setShowExportDialog(false);
                      } catch (error) {
                        alert(
                          `Failed to export PDF: ${
                            error instanceof Error ? error.message : 'Unknown error'
                          }`,
                        );
                      }
                    }}
                    className="w-full rounded-md bg-blue-600 text-white py-3 font-medium hover:bg-blue-700 transition-all"
                  >
                    Export as PDF
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/export/fire-extinguisher-template', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            inspectedBy: checklistData.inspectedBy,
                            inspectionDate: checklistData.inspectionDate,
                            designation: checklistData.designation,
                            signature: checklistData.signature,
                            extinguishers: checklistData.extinguishers,
                            format: 'excel',
                          }),
                        });
                        if (!response.ok) throw new Error('Export failed');
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        const filename = `Fire_Extinguisher_Checklist_${
                          new Date().toISOString().split('T')[0]
                        }.xlsx`;
                        link.download = filename;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                        setShowExportDialog(false);
                      } catch (error) {
                        alert(
                          `Failed to export Excel: ${
                            error instanceof Error ? error.message : 'Unknown error'
                          }`,
                        );
                      }
                    }}
                    className="w-full rounded-md border border-gray-300 text-gray-700 py-3 font-medium hover:bg-gray-50 transition-all"
                  >
                    Export as Excel
                  </button>
                </div>
                <button
                  onClick={() => setShowExportDialog(false)}
                  className="w-full mt-3 rounded-md border border-gray-300 text-gray-700 py-2.5 font-medium hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Submit Confirmation Dialog */}
          {showSubmitDialog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-md w-full shadow-lg">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Submit Checklist?</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to submit this fire extinguisher checklist? This action
                  cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSubmitDialog(false)}
                    className="flex-1 rounded-md border border-gray-300 text-gray-700 py-2.5 font-medium hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="flex-1 rounded-md bg-blue-600 text-white py-2.5 font-medium hover:bg-blue-700 transition-all"
                  >
                    Confirm Submit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AI Camera Capture Modal */}
          {showAIScanner && scanningExtinguisherIndex !== null && (
            <AICameraCapture
              onComplete={handleAICaptureComplete}
              onCancel={handleAICaptureCancel}
            />
          )}

          {/* AI Processing Loader */}
          {isProcessingAI && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-md w-full text-center shadow-lg">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-800">AI is Analyzing Images</h3>
                <p className="text-gray-600">
                  Processing your photos and detecting fire extinguisher components...
                </p>
              </div>
            </div>
          )}

          {/* AI Error Message Dialog */}
          {aiErrorMessage && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-md w-full shadow-lg">
                <div className="mb-4">
                  <p className="text-gray-800 text-base leading-relaxed">{aiErrorMessage}</p>
                </div>
                <button
                  onClick={() => setAiErrorMessage(null)}
                  className="w-full rounded-md bg-blue-600 text-white py-2.5 font-medium hover:bg-blue-700 transition-all"
                >
                  OK
                </button>
              </div>
            </div>
          )}

          {/* AI Results Preview Dialog */}
          {showAIResults && currentAIResults && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
              <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl w-full my-8 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">AI Scan Results</h3>
                    <p className="text-sm text-gray-600">
                      {currentAIResults.detections.length} components detected
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAIResults(false)}
                    className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                  >
                    ×
                  </button>
                </div>
                <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                  {currentAIResults.detections.map((detection, idx) => (
                    <div
                      key={idx}
                      className="rounded-md border border-gray-200 p-3 flex items-center justify-between bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm capitalize text-gray-800">
                            {detection.field.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              detection.value === '✓'
                                ? 'bg-green-100 text-green-700'
                                : detection.value === 'X'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {detection.value}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">{detection.reasoning}</p>
                      </div>
                      <span className="px-3 py-1 text-xs text-gray-600">
                        {Math.round(detection.confidence * 100)}%
                      </span>
                    </div>
                  ))}
                  {currentAIResults.extractedData.expiryDate && (
                    <div className="rounded-md border border-gray-200 p-3 flex items-center justify-between bg-gray-50">
                      <div className="flex-1">
                        <span className="font-medium text-sm text-gray-800">Expiry Date</span>
                        <p className="text-xs text-gray-600 mt-1">
                          {currentAIResults.extractedData.expiryDate.value}
                        </p>
                      </div>
                      <span className="px-3 py-1 text-xs text-gray-600">
                        {Math.round(currentAIResults.extractedData.expiryDate.confidence * 100)}%
                      </span>
                    </div>
                  )}
                </div>
                <div className="rounded-md border border-blue-200 bg-blue-50 p-4 mb-4">
                  <p className="text-sm text-blue-800 font-medium mb-1">Review Required</p>
                  <p className="text-xs text-gray-600">
                    AI results have been automatically filled. Please review and adjust any fields
                    as needed before submitting.
                  </p>
                </div>
                <button
                  onClick={() => setShowAIResults(false)}
                  className="w-full rounded-md bg-blue-600 text-white py-2.5 font-medium hover:bg-blue-700 transition-all"
                >
                  Review Form
                </button>
              </div>
            </div>
          )}
        </div>
      </InspectorLayout>
    </ProtectedRoute>
  );
};

export default FireExtinguisherChecklist;
