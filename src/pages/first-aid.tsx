import React, { useState, useEffect } from 'react';
import InspectorLayout from '@/roles/inspector/layouts/InspectorLayout';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/router';
import { generateFirstAidPDF, downloadPDF } from '@/utils/templatePdfGenerator';
import SimpleCameraCapture, { CapturedImage } from '@/components/SimpleCameraCapture';

type RatingType = '✓' | 'X' | 'NA' | null;
type InspectionStatus = 'draft' | 'completed';

interface FirstAidItem {
  id: string;
  name: string;
  expiryDateOption: 'NA' | 'date';
  expiryDate: string;
  quantity: string;
  previousQuantity?: string;
  status: RatingType;
}

interface FirstAidKitInspection {
  id: string;
  no: number;
  model: string;
  location: string;
  modelNo: string;
  items: FirstAidItem[];
  remarks: string;
  capturedImages?: CapturedImage[];
}

interface InspectionData {
  id: string;
  inspectedBy: string;
  designation: string;
  inspectionDate: string;
  signature: string;
  status: InspectionStatus;
  kits: FirstAidKitInspection[];
  createdAt: string;
}

const INITIAL_KITS_DATA = [
  { id: '1', no: 1, model: 'PVC Large', location: 'Ground Floor', modelNo: 'P-3' },
  { id: '2', no: 2, model: 'AS Transparent Small', location: 'Ground Floor', modelNo: 'AS-3ET' },
  { id: '3', no: 3, model: 'AS Transparent Small', location: 'Ground Floor', modelNo: 'AS-3ET' },
  { id: '4', no: 4, model: 'PVC Large', location: 'First Floor', modelNo: 'P-3' },
  { id: '5', no: 5, model: 'AS Transparent Small', location: 'First Floor', modelNo: 'AS-3ET' },
  { id: '6', no: 6, model: 'AS Transparent Small', location: 'First Floor', modelNo: 'AS-3ET' },
  { id: '7', no: 7, model: 'AS Transparent Small', location: 'Second Floor', modelNo: 'AS-3ET' },
  { id: '8', no: 8, model: 'AS Transparent Small', location: 'Second Floor', modelNo: 'AS-3ET' },
];

const FIRST_AID_ITEMS = [
  'Cotton Wool',
  'Cotton Swabs',
  'Cotton Buds',
  'Cotton Balls',
  'Analgesic Cream (Flanil)',
  'Antiseptic Cream (Bacidin)',
  'Surgical Tape 1.25cm',
  'Lint Dressing No. 8',
  'Wound Dressing',
  'Non-Adherent Wound Compress',
  'Gauze Swabs (5cmx5cmx8ply)',
  'Non-Woven Triangular Bandage',
  'Elastic Gauze Bandage 8cm',
  'W.O.W Bandage (2.5cm/5cm/7.5cm)',
  'Antibacterial Disinfectant (BactePro)',
  'Antibacterial Disinfectant (Dr Cleanol)',
  'Losyen Kuning (Cap Kaki Tiga)',
  'Alcohol Swab',
  'Linemen Wintergreen',
  'Safety/Cloth Pin',
  'Emergency Blanket',
  'CPR Face Shield',
  'Plastic Tweezers',
  'Scissors',
  'Assorted Plasters 50s',
  'Plastic Strips 10s',
  'Adhesive Plaster (Snowflake)',
  'Roll Bandage',
];

const createInitialItems = (): FirstAidItem[] => {
  return FIRST_AID_ITEMS.map((name, idx) => ({
    id: `item${idx + 1}`,
    name,
    expiryDateOption: 'NA',
    expiryDate: '',
    quantity: '',
    status: null,
  }));
};

const FirstAidInspection: React.FC = () => {
  const { hasPermission, user } = useAuth();
  const router = useRouter();
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [expandedKit, setExpandedKit] = useState<number | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [photographingKitIndex, setPhotographingKitIndex] = useState<number | null>(null);

  const loadPreviousInspectionData = () => {
    try {
      const history = JSON.parse(localStorage.getItem('first-aid-history') || '[]');
      return history.length > 0 ? history[history.length - 1] : null;
    } catch (error) {
      console.error('Error loading previous inspection:', error);
      return null;
    }
  };

  const [inspectionData, setInspectionData] = useState<InspectionData>(() => {
    const previousInspection = loadPreviousInspectionData();
    return {
      id: Date.now().toString(),
      inspectedBy: user?.name || '',
      designation: user?.role || 'HSE',
      inspectionDate: new Date().toISOString().split('T')[0],
      signature: '',
      status: 'draft',
      kits: INITIAL_KITS_DATA.map((kit) => {
        const previousKit = previousInspection?.kitInspections?.find(
          (pk: any) => pk.modelNo === kit.modelNo && pk.location === kit.location,
        );
        return {
          ...kit,
          items: createInitialItems().map((item, idx) => {
            const previousItem = previousKit?.items?.[idx];
            return {
              ...item,
              previousQuantity: previousItem?.quantity || '',
              expiryDateOption: previousItem?.expiryDateOption || 'NA',
              expiryDate: previousItem?.expiryDate || '',
            };
          }),
          remarks: '',
        };
      }),
      createdAt: new Date().toISOString(),
    };
  });

  useEffect(() => {
    if (!hasPermission('canCreateInspections')) {
      router.push('/');
    }
  }, [hasPermission, router]);

  // Load existing draft if available
  useEffect(() => {
    try {
      const drafts = JSON.parse(localStorage.getItem('first-aid-drafts') || '[]');
      if (drafts.length > 0) {
        // Load the most recent draft
        const latestDraft = drafts[drafts.length - 1];
        setInspectionData(latestDraft);
        console.log('[First Aid] Loaded draft:', latestDraft.id);
      }
    } catch (error) {
      console.error('[First Aid] Error loading draft:', error);
    }
  }, []);

  if (!hasPermission('canCreateInspections')) {
    return null;
  }

  const updateField = (field: keyof InspectionData, value: any) => {
    setInspectionData((prev) => ({ ...prev, [field]: value }));
  };

  const updateKitItem = (
    kitIndex: number,
    itemIndex: number,
    field: keyof FirstAidItem,
    value: any,
  ) => {
    setInspectionData((prev) => ({
      ...prev,
      kits: prev.kits.map((kit, kIdx) =>
        kIdx === kitIndex
          ? {
              ...kit,
              items: kit.items.map((item, iIdx) =>
                iIdx === itemIndex ? { ...item, [field]: value } : item,
              ),
            }
          : kit,
      ),
    }));
  };

  const updateKitRemarks = (kitIndex: number, remarks: string) => {
    setInspectionData((prev) => ({
      ...prev,
      kits: prev.kits.map((kit, idx) => (idx === kitIndex ? { ...kit, remarks } : kit)),
    }));
  };

  const checkItemExpiryDate = (expiryDate: string) => {
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
    inspectionData.kits.forEach((kit) => {
      kit.items.forEach((item) => {
        if (item.expiryDateOption === 'date' && item.expiryDate) {
          const status = checkItemExpiryDate(item.expiryDate);
          if (status?.type === 'expired') expired++;
          else if (status?.type === 'warning') expiringSoon++;
        }
      });
    });
    return { expired, expiringSoon };
  };

  const handleSaveDraft = () => {
    try {
      const drafts = JSON.parse(localStorage.getItem('first-aid-drafts') || '[]');
      const existingIndex = drafts.findIndex((d: InspectionData) => d.id === inspectionData.id);
      if (existingIndex >= 0) {
        drafts[existingIndex] = inspectionData;
      } else {
        drafts.push(inspectionData);
      }
      localStorage.setItem('first-aid-drafts', JSON.stringify(drafts));
      alert('Draft saved successfully!');
    } catch (error) {
      alert('Failed to save draft');
    }
  };

  const handleSubmit = async () => {
    try {
      // Submit to Supabase
      const response = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formType: 'first_aid',
          status: 'pending_review',
          data: {
            inspectedBy: inspectionData.inspectedBy,
            inspectionDate: inspectionData.inspectionDate,
            designation: inspectionData.designation,
            signature: inspectionData.signature,
            kits: inspectionData.kits,
            kitInspections: inspectionData.kits,
            company: 'Theta Edge Berhad',
            location: 'All Locations',
          },
          signature: {
            dataUrl: inspectionData.signature,
            timestamp: new Date().toISOString(),
            inspectorId: user?.id || '',
            inspectorName: inspectionData.inspectedBy,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit inspection');
      }

      // Remove from drafts after successful submission
      const drafts = JSON.parse(localStorage.getItem('first-aid-drafts') || '[]');
      const updatedDrafts = drafts.filter((d: InspectionData) => d.id !== inspectionData.id);
      localStorage.setItem('first-aid-drafts', JSON.stringify(updatedDrafts));

      setShowSubmitDialog(false);
      alert('First Aid Inspection submitted successfully!');
      router.push('/inspector/forms');
    } catch (error) {
      console.error('Submit error:', error);
      alert(
        `Failed to submit inspection: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  };

  const getKitCompletionStatus = (kit: FirstAidKitInspection) => {
    const answeredItems = kit.items.filter((item) => item.status !== null).length;
    return { completed: answeredItems, total: kit.items.length };
  };

  const getKitExpiryStatus = (kit: FirstAidKitInspection) => {
    let expired = 0;
    let expiringSoon = 0;
    kit.items.forEach((item) => {
      if (item.expiryDateOption === 'date' && item.expiryDate) {
        const status = checkItemExpiryDate(item.expiryDate);
        if (status?.type === 'expired') expired++;
        else if (status?.type === 'warning') expiringSoon++;
      }
    });
    return { expired, expiringSoon };
  };

  const startPhotoCapture = (kitIndex: number) => {
    setPhotographingKitIndex(kitIndex);
    setShowCamera(true);
  };

  const handlePhotoCaptureComplete = (images: CapturedImage[]) => {
    if (photographingKitIndex === null) return;

    // Capturing for the kit
    setInspectionData((prev) => ({
      ...prev,
      kits: prev.kits.map((kit, idx) =>
        idx === photographingKitIndex
          ? { ...kit, capturedImages: [...(kit.capturedImages || []), ...images] }
          : kit,
      ),
    }));

    setShowCamera(false);
    setPhotographingKitIndex(null);
  };

  const handlePhotoCaptureCancel = () => {
    setShowCamera(false);
    setPhotographingKitIndex(null);
  };

  const deleteKitImage = (kitIndex: number, imageIndex: number) => {
    setInspectionData((prev) => ({
      ...prev,
      kits: prev.kits.map((kit, idx) =>
        idx === kitIndex
          ? {
              ...kit,
              capturedImages: kit.capturedImages?.filter((_, i) => i !== imageIndex),
            }
          : kit,
      ),
    }));
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
              <h1 className="text-xl font-bold text-gray-800">First Aid Items Checklist</h1>
              <p className="text-gray-500 text-xs">HSEP-08/FAIC(F)/RV00-018</p>
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
                      value={inspectionData.inspectedBy}
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
                      value={inspectionData.inspectionDate}
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
                      value={inspectionData.designation}
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
                              <span className="font-semibold">{summary.expired}</span> first aid
                              item{summary.expired > 1 ? 's have' : ' has'} expired
                            </p>
                          )}
                          {summary.expiringSoon > 0 && (
                            <p className="text-sm text-yellow-700">
                              <span className="font-semibold">{summary.expiringSoon}</span> first
                              aid item{summary.expiringSoon > 1 ? 's are' : ' is'} expiring within
                              30 days
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          Please review and replace expired or expiring items immediately
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Section 2: First Aid Kits Inspection */}
            <div className="bg-white rounded-lg p-6 space-y-4 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                Section 2: First Aid Kits Inspection
              </h2>
              <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 mb-6">
                <p className="text-sm font-medium text-blue-800 mb-2">LEGEND:</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <span className="text-green-600 font-bold">✓</span> = OK / Available
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-red-600 font-bold">✕</span> = Not Available
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-blue-600 font-bold">NA</span> = Not Applicable
                  </span>
                </div>
              </div>

              {/* All Kits - Expandable Cards */}
              <div className="space-y-4">
                {inspectionData.kits.map((kit, kitIndex) => {
                  const status = getKitCompletionStatus(kit);
                  const expiryStatus = getKitExpiryStatus(kit);
                  const isExpanded = expandedKit === kitIndex;
                  return (
                    <div
                      key={kit.id}
                      className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm"
                    >
                      <div
                        onClick={() => setExpandedKit(isExpanded ? null : kitIndex)}
                        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="rounded-md border border-blue-600 text-blue-600 px-2 py-0.5 text-xs font-medium">
                                #{kit.no}
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
                              {kit.capturedImages && kit.capturedImages.length > 0 && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-3 w-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                                    />
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                  </svg>
                                  {kit.capturedImages.length} photo
                                  {kit.capturedImages.length !== 1 ? 's' : ''}
                                </span>
                              )}
                              {expiryStatus.expired > 0 && (
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                                  ⚠️
                                  {expiryStatus.expired} expired
                                </span>
                              )}
                              {expiryStatus.expiringSoon > 0 && (
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                                  ⏰{expiryStatus.expiringSoon} expiring soon
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium text-gray-800">
                              {kit.model} - {kit.modelNo}
                            </p>
                            <p className="text-sm text-gray-600">{kit.location}</p>
                            <div className="mt-2 flex items-center gap-2">
                              <div className="rounded-md border border-blue-600 text-blue-600 px-2 py-0.5 text-xs font-medium">
                                {status.completed}/{status.total} items
                              </div>
                            </div>
                          </div>
                          <span className="text-gray-600">{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="p-4 space-y-3">
                          <button
                            onClick={() => startPhotoCapture(kitIndex)}
                            className="w-full rounded-md bg-blue-600 text-white py-2 px-4 font-medium hover:bg-blue-700 transition-all"
                          >
                            {kit.capturedImages && kit.capturedImages.length > 0
                              ? 'Add More Photos'
                              : 'Capture Photos'}
                          </button>
                          {kit.capturedImages && kit.capturedImages.length > 0 && (
                            <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                              <p className="text-xs text-blue-800 font-medium mb-3">
                                {kit.capturedImages.length} photo(s) captured
                              </p>
                              <div className="grid grid-cols-3 gap-2">
                                {kit.capturedImages.map((image, imgIdx) => (
                                  <div key={imgIdx} className="relative group">
                                    <img
                                      src={image.dataUrl}
                                      alt={`Kit ${kit.no} - Photo ${imgIdx + 1}`}
                                      className="w-full h-24 object-cover rounded-md border border-gray-300"
                                    />
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 rounded-b-md">
                                      {new Date(image.timestamp).toLocaleTimeString()}
                                    </div>
                                    <button
                                      onClick={() => deleteKitImage(kitIndex, imgIdx)}
                                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-3 w-3"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M6 18L18 6M6 6l12 12"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {kit.items.map((item, itemIndex) => (
                            <div
                              key={item.id}
                              className="bg-gray-50 rounded-lg border border-gray-200 p-4"
                            >
                              <div className="flex items-start gap-2 mb-3">
                                <div className="w-6 h-6 rounded-md border border-blue-600 flex items-center justify-center flex-shrink-0">
                                  <span className="text-blue-600 text-xs font-medium">
                                    {itemIndex + 1}
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-gray-800 flex-1">
                                  {item.name}
                                </p>
                              </div>
                              <div className="grid grid-cols-3 gap-2 mb-3">
                                <button
                                  onClick={() => updateKitItem(kitIndex, itemIndex, 'status', '✓')}
                                  className={`py-2 px-3 rounded-md font-medium text-lg transition-all ${
                                    item.status === '✓'
                                      ? 'bg-green-600 text-white'
                                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => updateKitItem(kitIndex, itemIndex, 'status', 'X')}
                                  className={`py-2 px-3 rounded-md font-medium text-lg transition-all ${
                                    item.status === 'X'
                                      ? 'bg-red-600 text-white'
                                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  ✕
                                </button>
                                <button
                                  onClick={() => updateKitItem(kitIndex, itemIndex, 'status', 'NA')}
                                  className={`py-2 px-3 rounded-md font-medium text-sm transition-all ${
                                    item.status === 'NA'
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  NA
                                </button>
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Expiry Date
                                  </label>
                                  <div className="grid grid-cols-2 gap-2 mb-2">
                                    <button
                                      onClick={() =>
                                        updateKitItem(kitIndex, itemIndex, 'expiryDateOption', 'NA')
                                      }
                                      className={`py-1.5 px-3 rounded-md font-medium text-xs transition-all ${
                                        item.expiryDateOption === 'NA'
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                      }`}
                                    >
                                      N/A
                                    </button>
                                    <button
                                      onClick={() =>
                                        updateKitItem(
                                          kitIndex,
                                          itemIndex,
                                          'expiryDateOption',
                                          'date',
                                        )
                                      }
                                      className={`py-1.5 px-3 rounded-md font-medium text-xs transition-all ${
                                        item.expiryDateOption === 'date'
                                          ? 'bg-green-600 text-white'
                                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                      }`}
                                    >
                                      Set Date
                                    </button>
                                  </div>
                                  {item.expiryDateOption === 'date' && (
                                    <>
                                      <input
                                        type="date"
                                        value={item.expiryDate}
                                        onChange={(e) =>
                                          updateKitItem(
                                            kitIndex,
                                            itemIndex,
                                            'expiryDate',
                                            e.target.value,
                                          )
                                        }
                                        className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 text-sm ${
                                          checkItemExpiryDate(item.expiryDate)?.type === 'expired'
                                            ? 'border-red-500 bg-red-50 focus:ring-red-500'
                                            : checkItemExpiryDate(item.expiryDate)?.type ===
                                              'warning'
                                            ? 'border-yellow-500 bg-yellow-50 focus:ring-yellow-500'
                                            : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
                                        }`}
                                      />
                                      {item.expiryDate && checkItemExpiryDate(item.expiryDate) && (
                                        <div
                                          className={`mt-2 p-2 rounded-md border flex items-start gap-2 ${
                                            checkItemExpiryDate(item.expiryDate)?.type === 'expired'
                                              ? 'bg-red-50 border-red-200'
                                              : checkItemExpiryDate(item.expiryDate)?.type ===
                                                'warning'
                                              ? 'bg-yellow-50 border-yellow-200'
                                              : 'bg-green-50 border-green-200'
                                          }`}
                                        >
                                          <span className="flex-shrink-0 text-base">
                                            {checkItemExpiryDate(item.expiryDate)?.type ===
                                            'expired'
                                              ? '⚠️'
                                              : checkItemExpiryDate(item.expiryDate)?.type ===
                                                'warning'
                                              ? '⏰'
                                              : '✅'}
                                          </span>
                                          <div className="flex-1">
                                            <p
                                              className={`text-xs font-semibold ${
                                                checkItemExpiryDate(item.expiryDate)?.type ===
                                                'expired'
                                                  ? 'text-red-800'
                                                  : checkItemExpiryDate(item.expiryDate)?.type ===
                                                    'warning'
                                                  ? 'text-yellow-800'
                                                  : 'text-green-800'
                                              }`}
                                            >
                                              {checkItemExpiryDate(item.expiryDate)?.type ===
                                              'expired'
                                                ? `EXPIRED ${
                                                    checkItemExpiryDate(item.expiryDate)?.days
                                                  } days ago`
                                                : checkItemExpiryDate(item.expiryDate)?.type ===
                                                  'warning'
                                                ? `Expiring in ${
                                                    checkItemExpiryDate(item.expiryDate)?.days
                                                  } days`
                                                : `Valid (${
                                                    checkItemExpiryDate(item.expiryDate)?.days
                                                  } days remaining)`}
                                            </p>
                                            {checkItemExpiryDate(item.expiryDate)?.type !==
                                              'valid' && (
                                              <p className="text-xs text-gray-600 mt-1">
                                                {checkItemExpiryDate(item.expiryDate)?.type ===
                                                'expired'
                                                  ? 'Replace this item immediately'
                                                  : 'Plan to restock soon'}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="block text-xs font-medium text-gray-700">
                                      Quantity
                                    </label>
                                    {item.previousQuantity && (
                                      <span className="text-xs text-gray-600 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md">
                                        Last: {item.previousQuantity}
                                      </span>
                                    )}
                                  </div>
                                  <input
                                    type="text"
                                    value={item.quantity}
                                    onChange={(e) =>
                                      updateKitItem(kitIndex, itemIndex, 'quantity', e.target.value)
                                    }
                                    placeholder={
                                      item.previousQuantity
                                        ? `Last was ${item.previousQuantity}`
                                        : 'e.g., 10'
                                    }
                                    className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                            <label className="block text-xs font-medium text-gray-700 mb-2">
                              Kit Remarks
                            </label>
                            <textarea
                              value={kit.remarks}
                              onChange={(e) => updateKitRemarks(kitIndex, e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              placeholder="Any issues or notes for this kit..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
                    onClick={() => {
                      try {
                        const pdf = generateFirstAidPDF({
                          inspectedBy: inspectionData.inspectedBy,
                          inspectionDate: inspectionData.inspectionDate,
                          designation: inspectionData.designation,
                          signature: inspectionData.signature,
                          kits: inspectionData.kits,
                        });
                        const date = new Date(inspectionData.inspectionDate);
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
                        const filename = `First_Aid_Checklist_${
                          monthNames[date.getMonth()]
                        }_${date.getFullYear()}.pdf`;
                        downloadPDF(pdf, filename);
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
                        const response = await fetch('/api/export/first-aid-template', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ ...inspectionData, format: 'excel' }),
                        });
                        if (!response.ok) throw new Error('Export failed');
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        const filename = `First_Aid_Checklist_${
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
                  Are you sure you want to submit this first aid checklist? This action cannot be
                  undone.
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

          {/* Camera Capture Modal */}
          {showCamera && photographingKitIndex !== null && (
            <SimpleCameraCapture
              onComplete={handlePhotoCaptureComplete}
              onCancel={handlePhotoCaptureCancel}
              maxPhotos={2}
            />
          )}
        </div>
      </InspectorLayout>
    </ProtectedRoute>
  );
};

export default FirstAidInspection;
