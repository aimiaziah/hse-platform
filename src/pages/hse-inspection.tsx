import React, { useState, useRef, useEffect } from 'react';
import InspectorLayout from '@/roles/inspector/layouts/InspectorLayout';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import {
  ArrowLeft,
  RefreshCw,
  Eye,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  Edit2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/router';
import { downloadHSEInspectionChecklistWithTemplate } from '@/utils/hseChecklistExport';
import { downloadHSEObservationForm } from '@/utils/hseObservationExport';
import { storage } from '@/utils/storage';

const HSEInspectionForm = () => {
  const { hasPermission } = useAuth();
  const router = useRouter();
  const [inspectionId, setInspectionId] = useState<string>('');
  const [observations, setObservations] = useState<any[]>([]);

  useEffect(() => {
    const existingId = localStorage.getItem('active-hse-inspection-id');
    if (existingId) {
      setInspectionId(existingId);
    } else {
      const newId = Date.now().toString();
      localStorage.setItem('active-hse-inspection-id', newId);
      setInspectionId(newId);
    }
  }, []);

  useEffect(() => {
    if (!hasPermission('canCreateInspections')) {
      router.push('/');
    }
  }, [hasPermission, router]);

  useEffect(() => {
    if (!inspectionId) return;
    const loadObservations = () => {
      const savedObservations = JSON.parse(
        localStorage.getItem(`hse-observations-${inspectionId}`) || '[]',
      );
      setObservations(savedObservations);
    };
    loadObservations();
    window.addEventListener('storage', loadObservations);
    window.addEventListener('focus', loadObservations);
    return () => {
      window.removeEventListener('storage', loadObservations);
      window.removeEventListener('focus', loadObservations);
    };
  }, [inspectionId]);

  if (!hasPermission('canCreateInspections')) {
    return null;
  }

  const [formData, setFormData] = useState({
    contractor: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    inspectedBy: '',
    workActivity: '',
    tablePersons: [
      { no: 1, name: '', designation: '', signature: '' },
      { no: 2, name: '', designation: '', signature: '' },
      { no: 3, name: '', designation: '', signature: '' },
      { no: 4, name: '', designation: '', signature: '' },
      { no: 5, name: '', designation: '', signature: '' },
    ],
    inspectionItems: [],
    commentsRemarks: '',
  });

  useEffect(() => {
    if (!inspectionId) return;
    const savedFormData = localStorage.getItem(`hse-formdata-${inspectionId}`);
    if (savedFormData) {
      try {
        const parsed = JSON.parse(savedFormData);
        setFormData(parsed);
      } catch (error) {
        console.error('Error loading form data:', error);
      }
    }
  }, [inspectionId]);

  useEffect(() => {
    if (!inspectionId) return;
    localStorage.setItem(`hse-formdata-${inspectionId}`, JSON.stringify(formData));
  }, [formData, inspectionId]);

  const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({});
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentSignatureIndex, setCurrentSignatureIndex] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const categories = [
    {
      id: 1,
      name: 'WORKING AREAS',
      items: [
        'Housekeeping',
        'Proper barrier/ safety signs',
        'Lighting adequacy',
        'Site layout arrangement',
        'Ventilation',
        'Floor/ ground-edge/ opening condition',
        'Escape/ working route condition',
        'Material storage/ stacking',
      ],
    },
    {
      id: 2,
      name: 'SITE OFFICE',
      items: [
        'Office ergonomics',
        'Location and maintenance',
        'Fire extinguishers condition',
        'First aid box facility',
        "Worker's legality / age",
        'Green card (CIDB)/ NIOSH cert.',
        'PMA/ PMT/ JBE/ DOE approval',
        'Competent scaffolder',
      ],
    },
    {
      id: 3,
      name: 'HOT WORK/ ELECTRICAL',
      items: [
        'Gas cylinders secured and upright',
        'Gauge functionality',
        'Flashback arrestors availability',
        'Cables insulation/ earthing',
        'Wiring condition-plugs, joints, DB',
      ],
    },
    {
      id: 4,
      name: 'PERSONAL PROTECTIVE EQUIPMENT',
      items: [
        'Safety helmets',
        'Safety footwear',
        'Safety vest',
        'Proper attire',
        'Other; as per job requirements',
      ],
    },
    {
      id: 5,
      name: 'EXCAVATIONS',
      items: [
        'Safely secured-sign, barrier covered',
        'No material at 1m from edge',
        'Proper & adequate access & egress',
        'Adequate slope protection',
        'Check for underground hazard',
        'Inspection checklist',
      ],
    },
    {
      id: 6,
      name: 'SCAFFOLDING',
      items: [
        'PE design requirement',
        'Access condition',
        'Walkways/ platform condition',
        'Adequate slope protection',
        'Means of fall protection',
        'Ground/base condition',
        'Inspection checklist',
      ],
    },
    {
      id: 7,
      name: 'MACHINERY & PLANT',
      items: [
        'Machinery guarding',
        'Machinery/ plant service record',
        'Properly and safely sited',
        'Skid tank condition',
        'Lifting process/ gear condition',
        "Vehicle's condition",
      ],
    },
    {
      id: 8,
      name: 'TRAFFIC MANAGEMENT',
      items: [
        'Flagman availability & adequacy',
        'Signages availability & adequacy',
        'Vehicle route maintenance',
        'Public road maintenance',
        'Loads protection',
        'Method of controlling',
      ],
    },
    {
      id: 9,
      name: 'HEALTH',
      items: [
        'First aid box/ facility',
        'First aider availability',
        'Vector/ Pest control',
        'Washing/ clean water facility',
        'Toilet condition / availability',
      ],
    },
    {
      id: 10,
      name: 'ENVIRONMENTAL',
      items: [
        'Control of oil pollution',
        'Control of dust pollution / emission',
        'Control of noise pollution / emission',
        'Control of open burning',
        'Control of debris / rubbish',
        'Silt trap/drainage/culvert maintenance',
      ],
    },
    {
      id: 11,
      name: 'SECURITY',
      items: [
        'Security personal adequacy',
        'Security sign condition/ availability',
        'Control of site access/ exit',
        'Hoarding/ fencing condition',
        'Emergency contact list',
      ],
    },
    {
      id: 12,
      name: 'PUBLIC SAFETY',
      items: [
        'Warning signs',
        'Control of public entry',
        'Proper work planning toward public safety',
        'Communication establishment',
        'Training on public safety to worker',
        'Catch platform',
        'Pedestrian protection',
      ],
    },
  ];

  const ratingOptions = [
    { value: 'G', label: 'G', color: 'bg-green-600', fullText: 'GOOD' },
    { value: 'A', label: 'A', color: 'bg-blue-600', fullText: 'ACCEPTABLE' },
    { value: 'P', label: 'P', color: 'bg-yellow-600', fullText: 'POOR' },
    { value: 'I', label: 'I', color: 'bg-gray-500', fullText: 'IRRELEVANT' },
    { value: 'SIN', label: 'SIN', color: 'bg-orange-600', fullText: 'SAFETY IMPROVEMENT NOTICE' },
    { value: 'SPS', label: 'SPS', color: 'bg-red-600', fullText: 'SAFETY PENALTY SYSTEM' },
    { value: 'SWO', label: 'SWO', color: 'bg-red-700', fullText: 'STOP WORK ORDER' },
  ];

  const getItemKey = (categoryId: number | string, item: string) => `${categoryId}-${item}`;

  const getRating = (categoryId: number | string, item: string) => {
    const key = getItemKey(categoryId, item);
    const itemData: any = formData.inspectionItems.find((i: any) => i.key === key);
    return itemData?.rating || null;
  };

  const getComment = (categoryId: number | string, item: string) => {
    const key = getItemKey(categoryId, item);
    const itemData: any = formData.inspectionItems.find((i: any) => i.key === key);
    return itemData?.comment || '';
  };

  const setRating = (categoryId: number | string, item: string, rating: string) => {
    const key = getItemKey(categoryId, item);
    setFormData((prev: any) => {
      const existingIndex = prev.inspectionItems.findIndex((i: any) => i.key === key);
      const newItems = [...prev.inspectionItems];
      if (existingIndex >= 0) {
        newItems[existingIndex] = { ...newItems[existingIndex], rating };
      } else {
        newItems.push({ key, categoryId, item, rating, comment: '' });
      }
      return { ...prev, inspectionItems: newItems };
    });
  };

  const setComment = (categoryId: number | string, item: string, comment: string) => {
    const key = getItemKey(categoryId, item);
    setFormData((prev: any) => {
      const existingIndex = prev.inspectionItems.findIndex((i: any) => i.key === key);
      const newItems = [...prev.inspectionItems];
      if (existingIndex >= 0) {
        newItems[existingIndex] = { ...newItems[existingIndex], comment };
      } else {
        newItems.push({ key, categoryId, item, rating: null, comment });
      }
      return { ...prev, inspectionItems: newItems };
    });
  };

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const updateTablePerson = (index: number, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      tablePersons: prev.tablePersons.map((person, i) =>
        i === index ? { ...person, [field]: value } : person,
      ),
    }));
  };

  const addTablePerson = () => {
    setFormData((prev) => ({
      ...prev,
      tablePersons: [
        ...prev.tablePersons,
        {
          no: prev.tablePersons.length + 1,
          name: '',
          designation: '',
          signature: '',
        },
      ],
    }));
  };

  const removeTablePerson = (index: number) => {
    setFormData((prev) => {
      const newPersons = prev.tablePersons.filter((_, i) => i !== index);
      return {
        ...prev,
        tablePersons: newPersons.map((person, i) => ({
          ...person,
          no: i + 1,
        })),
      };
    });
  };

  const startDrawing = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || currentSignatureIndex === null) return;
    const dataUrl = canvas.toDataURL();
    updateTablePerson(currentSignatureIndex, 'signature', dataUrl);
    setCurrentSignatureIndex(null);
  };

  const getTotalRated = () => {
    return formData.inspectionItems.filter((item: any) => item.rating).length;
  };

  const getTotalItems = () => {
    return categories.reduce((sum, cat) => sum + cat.items.length, 0);
  };

  const getCompletionPercentage = () => {
    const total = getTotalItems();
    const rated = getTotalRated();
    return total > 0 ? Number(((rated / total) * 100).toFixed(2)) : 0;
  };

  const handleAddObservation = (
    categoryId: number | string,
    categoryName: string,
    item: string,
  ) => {
    if (!formData.location.trim()) {
      alert('Please fill in the Location field before adding observations.');
      return;
    }
    if (!formData.date) {
      alert('Please select a Date before adding observations.');
      return;
    }
    router.push({
      pathname: '/hse-observation',
      query: {
        categoryId,
        categoryName,
        itemName: item,
        inspectionId,
        location: formData.location,
        date: formData.date,
      },
    });
  };

  const handleEditObservation = (observation: any) => {
    router.push({
      pathname: '/hse-observation',
      query: {
        categoryId: observation.categoryId,
        categoryName: observation.categoryName,
        itemName: observation.itemName,
        inspectionId,
        location: formData.location,
        date: formData.date,
        editId: observation.id,
      },
    });
  };

  const getObservationsForItem = (categoryId: number | string, item: string) => {
    return observations.filter((obs) => obs.categoryId === categoryId && obs.itemName === item);
  };

  const handleStartNewInspection = () => {
    if (
      observations.length > 0 ||
      formData.contractor ||
      formData.location ||
      getTotalRated() > 0
    ) {
      const confirmed = window.confirm(
        'Are you sure you want to start a new inspection? All current data will be cleared.',
      );
      if (!confirmed) return;
    }
    localStorage.removeItem(`hse-observations-${inspectionId}`);
    localStorage.removeItem(`hse-formdata-${inspectionId}`);
    localStorage.removeItem('active-hse-inspection-id');
    window.location.reload();
  };

  return (
    <ProtectedRoute requiredPermission="canCreateInspections">
      <InspectorLayout>
        <div className="min-h-screen bg-gray-50 p-4 pb-20">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
              <div className="flex items-center mb-6">
                <button
                  onClick={() => router.push('/inspector/forms')}
                  className="mr-4 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                  title="Go back to Forms"
                >
                  <ArrowLeft className="w-6 h-6 text-blue-600" />
                </button>
                <h1 className="text-xl font-bold text-gray-800 flex-1 text-center">
                  HSE INSPECTION CHECKLIST
                </h1>
                <button
                  onClick={handleStartNewInspection}
                  className="hover:bg-gray-100 p-2 rounded-lg transition-colors"
                  title="Start new inspection"
                >
                  <RefreshCw className="w-6 h-6 text-blue-600" />
                </button>
              </div>

              {/* Observations Counter */}
              {observations.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      Total Observations: {observations.length}
                    </span>
                  </div>
                  <span className="text-xs text-gray-600">
                    Observations will be saved with this inspection
                  </span>
                </div>
              )}

              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CONTRACTOR <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.contractor}
                    onChange={(e) => setFormData({ ...formData, contractor: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter contractor name"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      LOCATION <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter location"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      DATE <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    INSPECTED BY <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.inspectedBy}
                    onChange={(e) => setFormData({ ...formData, inspectedBy: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter inspector name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    WORK ACTIVITY <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.workActivity}
                    onChange={(e) => setFormData({ ...formData, workActivity: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter work activity"
                  />
                </div>
              </div>
            </div>

            {/* People Section */}
            <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
              <div className="space-y-3">
                {formData.tablePersons.map((person, index) => (
                  <div key={person.no} className="border border-gray-200 rounded-lg p-3 relative">
                    {formData.tablePersons.length > 1 && (
                      <button
                        onClick={() => removeTablePerson(index)}
                        className="absolute top-2 right-2 p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Remove person"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <div className="flex items-center mb-2">
                      <span className="text-sm font-semibold text-gray-700 w-8">{person.no}.</span>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 pr-8">
                        <input
                          type="text"
                          placeholder="Name"
                          value={person.name}
                          onChange={(e) => updateTablePerson(index, 'name', e.target.value)}
                          className="px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          placeholder="Designation"
                          value={person.designation}
                          onChange={(e) => updateTablePerson(index, 'designation', e.target.value)}
                          className="px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="ml-8">
                      {person.signature ? (
                        <div className="relative">
                          <img
                            src={person.signature}
                            alt="Signature"
                            className="h-20 border border-gray-300 rounded-md"
                          />
                          <button
                            onClick={() => {
                              updateTablePerson(index, 'signature', '');
                              setCurrentSignatureIndex(index);
                            }}
                            className="absolute top-1 right-1 bg-gray-700 text-white px-2 py-0.5 rounded text-xs hover:bg-gray-800"
                          >
                            Clear
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setCurrentSignatureIndex(index)}
                          className="w-full py-2 rounded-md border-2 border-dashed border-gray-300 text-sm text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-colors"
                        >
                          + Add Signature
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={addTablePerson}
                className="mt-4 w-full py-2 rounded-lg border-2 border-dashed border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-blue-500 font-medium text-sm transition-colors"
              >
                + Add More Person
              </button>
            </div>

            {/* Progress Bar */}
            <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-gray-700">Progress</span>
                <span className="text-gray-600">
                  {getTotalRated()} / {getTotalItems()} ({getCompletionPercentage()}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getCompletionPercentage()}%` }}
                />
              </div>
            </div>

            {/* Inspection Categories */}
            <div className="space-y-3">
              {categories.map((category) => {
                const isExpanded = expandedCategories[category.id];
                const categoryRated = formData.inspectionItems.filter(
                  (item: any) => item.categoryId === category.id && item.rating,
                ).length;
                return (
                  <div
                    key={category.id}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm"
                  >
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center flex-1">
                        <span className="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold mr-3">
                          {category.id}
                        </span>
                        <div className="text-left">
                          <h3 className="font-medium text-gray-800 text-sm sm:text-base">
                            {category.name}
                          </h3>
                          <p className="text-xs text-gray-600">
                            {categoryRated} / {category.items.length} completed
                          </p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-700" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-700" />
                      )}
                    </button>

                    {/* Category Items */}
                    {isExpanded && (
                      <div className="border-t border-gray-200">
                        {category.items.map((item, itemIndex) => {
                          const rating = getRating(category.id, item);
                          const comment = getComment(category.id, item);
                          return (
                            <div
                              key={itemIndex}
                              className="p-4 border-b border-gray-200 last:border-b-0"
                            >
                              <div className="mb-3">
                                <p className="text-sm text-gray-800 font-medium mb-2">{item}</p>
                                {/* Rating Buttons */}
                                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
                                  {ratingOptions.map((option) => (
                                    <button
                                      key={option.value}
                                      onClick={() => setRating(category.id, item, option.value)}
                                      title={option.fullText}
                                      className={`
                                        px-2 py-1.5 rounded text-xs font-medium transition-all
                                        ${
                                          rating === option.value
                                            ? `${option.color} text-white`
                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                        }
                                      `}
                                    >
                                      {option.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {/* Comments */}
                              <textarea
                                placeholder="Comments (optional)"
                                value={comment}
                                onChange={(e) => setComment(category.id, item, e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                              />
                              {/* Add Observation Button & List */}
                              <div className="mt-3 space-y-2">
                                <button
                                  onClick={() =>
                                    handleAddObservation(category.id, category.name, item)
                                  }
                                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                  <Plus className="w-4 h-4" />
                                  Add Observation
                                </button>
                                {/* Show existing observations */}
                                {getObservationsForItem(category.id, item).length > 0 && (
                                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                    <p className="text-xs font-medium text-gray-800 mb-2">
                                      Observations (
                                      {getObservationsForItem(category.id, item).length})
                                    </p>
                                    <div className="space-y-2">
                                      {getObservationsForItem(category.id, item).map((obs) => (
                                        <div
                                          key={obs.id}
                                          className="bg-white rounded p-2 text-xs relative group"
                                        >
                                          <button
                                            onClick={() => handleEditObservation(obs)}
                                            className="absolute top-2 right-2 bg-blue-600 text-white p-1 rounded hover:bg-blue-700 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Edit observation"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </button>
                                          <p className="font-medium text-gray-900 pr-8">
                                            {obs.observation}
                                          </p>
                                          <p className="text-gray-600 mt-1">
                                            {obs.location} - {obs.date} {obs.time}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Observations Summary */}
            {observations.length > 0 && (
              <div className="mt-6 bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Observations Summary</h3>
                  <span className="border border-gray-300 text-gray-700 px-3 py-1 text-sm font-semibold rounded">
                    {observations.length} Total
                  </span>
                </div>
                <div className="space-y-3">
                  {observations.map((obs, index) => (
                    <div
                      key={obs.id}
                      className="border border-gray-200 p-4 hover:border-blue-500 transition-colors group relative rounded-lg"
                    >
                      <button
                        onClick={() => handleEditObservation(obs)}
                        className="absolute top-3 right-3 bg-blue-600 text-white px-3 py-1.5 hover:bg-blue-700 transition-colors text-sm font-medium opacity-0 group-hover:opacity-100 rounded-md"
                        title="Edit observation"
                      >
                        Edit
                      </button>
                      <div className="flex items-start gap-3">
                        <div className="border border-gray-300 text-gray-700 w-8 h-8 flex items-center justify-center font-bold text-sm flex-shrink-0 rounded-md">
                          {index + 1}
                        </div>
                        <div className="flex-1 pr-16">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium text-gray-900">{obs.categoryName}</p>
                              <p className="text-sm text-gray-600">{obs.itemName}</p>
                            </div>
                            {obs.photo && (
                              <div className="ml-2">
                                <img
                                  src={obs.photo}
                                  alt="Observation"
                                  className="w-16 h-16 object-cover rounded border border-gray-200"
                                />
                              </div>
                            )}
                          </div>
                          <div className="bg-gray-50 rounded p-3 space-y-1 text-sm">
                            <p className="text-gray-900">
                              <strong>Observation:</strong> {obs.observation}
                            </p>
                            <p className="text-gray-700">
                              <strong>Location:</strong> {obs.location}
                            </p>
                            <p className="text-gray-700">
                              <strong>Action Needed:</strong> {obs.actionNeeded}
                            </p>
                            <div className="flex gap-4 text-xs text-gray-600 mt-2">
                              <span>{obs.date}</span>
                              <span>{obs.time}</span>
                              {obs.status && (
                                <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                                  {obs.status}
                                </span>
                              )}
                              {obs.hazards && (
                                <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded">
                                  {obs.hazards}
                                </span>
                              )}
                            </div>
                            {obs.remarks && (
                              <p className="text-gray-600 text-xs mt-2">
                                <strong>Remarks:</strong> {obs.remarks}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments/Remarks Section */}
            <div className="mt-6 bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">COMMENTS / REMARKS</h3>
              <textarea
                value={formData.commentsRemarks}
                onChange={(e) => setFormData({ ...formData, commentsRemarks: e.target.value })}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none rounded-md"
                placeholder="Enter any additional comments or remarks here..."
              />
            </div>

            {/* Export Buttons */}
            {/* <div className="mt-6 bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Export Documents</h3>
              <p className="text-sm text-gray-600 mb-4">
                Export your inspection data as two separate documents: Inspection Checklist (Excel)
                and Observation Form (PDF)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={async () => {
                    try {
                      const checklistData = {
                        contractor: formData.contractor,
                        location: formData.location,
                        date: formData.date,
                        inspectedBy: formData.inspectedBy,
                        workActivity: formData.workActivity,
                        tablePersons: formData.tablePersons,
                        inspectionItems: formData.inspectionItems,
                        commentsRemarks: formData.commentsRemarks,
                      };
                      const observationData = {
                        contractor: formData.contractor,
                        location: formData.location,
                        date: formData.date,
                        inspectedBy: formData.inspectedBy,
                        workActivity: formData.workActivity,
                        observations: observations,
                      };
                      await downloadHSEInspectionChecklistWithTemplate(checklistData);
                      setTimeout(async () => {
                        await downloadHSEObservationForm(observationData);
                      }, 1000);
                    } catch (error) {
                      console.error('Export error:', error);
                      alert('Failed to export documents. Please try again.');
                    }
                  }}
                  className="bg-blue-600 text-white py-3 px-4 font-medium hover:bg-blue-700 transition-colors rounded-md"
                >
                  Export Both
                </button>
                <button
                  onClick={async () => {
                    try {
                      const checklistData = {
                        contractor: formData.contractor,
                        location: formData.location,
                        date: formData.date,
                        inspectedBy: formData.inspectedBy,
                        workActivity: formData.workActivity,
                        tablePersons: formData.tablePersons,
                        inspectionItems: formData.inspectionItems,
                        commentsRemarks: formData.commentsRemarks,
                      };
                      await downloadHSEInspectionChecklistWithTemplate(checklistData);
                    } catch (error) {
                      console.error('Export error:', error);
                      alert('Failed to export checklist. Please try again.');
                    }
                  }}
                  className="border-2 border-blue-600 text-blue-600 py-3 px-4 font-medium hover:bg-blue-50 transition-colors rounded-md"
                >
                  Checklist Only
                </button>
                <button
                  onClick={async () => {
                    try {
                      const observationData = {
                        contractor: formData.contractor,
                        location: formData.location,
                        date: formData.date,
                        inspectedBy: formData.inspectedBy,
                        workActivity: formData.workActivity,
                        observations: observations,
                      };
                      await downloadHSEObservationForm(observationData);
                    } catch (error) {
                      console.error('Export error:', error);
                      alert('Failed to export observation form. Please try again.');
                    }
                  }}
                  className="border-2 border-blue-600 text-blue-600 py-3 px-4 font-medium hover:bg-blue-50 transition-colors rounded-md"
                >
                  Observation Form
                </button>
              </div>
            </div> */}

            {/* Submit Button */}
            <div className="mt-4 bg-white rounded-lg shadow-sm p-4">
              <button
                onClick={async () => {
                  if (!formData.contractor.trim()) {
                    alert('Please enter Contractor name before submitting.');
                    return;
                  }
                  if (!formData.location.trim()) {
                    alert('Please enter Location before submitting.');
                    return;
                  }
                  if (!formData.inspectedBy.trim()) {
                    alert('Please enter Inspected By name before submitting.');
                    return;
                  }
                  if (!formData.workActivity.trim()) {
                    alert('Please enter Work Activity before submitting.');
                    return;
                  }
                  if (getTotalRated() !== getTotalItems()) {
                    const remainingItems = getTotalItems() - getTotalRated();
                    const confirmed = confirm(
                      `Warning: ${remainingItems} item(s) not rated yet.\n\nDo you want to continue with submission anyway?`,
                    );
                    if (!confirmed) return;
                  }
                  try {
                    const authToken = storage.load('authToken', null);
                    if (!authToken) {
                      alert(
                        'Authentication Error:\n\nYour session has expired. Please log in again.',
                      );
                      router.push('/login');
                      return;
                    }
                    const response = await fetch('/api/inspections', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${authToken}`,
                      },
                      credentials: 'include',
                      body: JSON.stringify({
                        formType: 'hse_general',
                        formTemplateId: null,
                        data: {
                          contractor: formData.contractor,
                          location: formData.location,
                          date: formData.date,
                          inspectedBy: formData.inspectedBy,
                          workActivity: formData.workActivity,
                          tablePersons: formData.tablePersons,
                          inspectionItems: formData.inspectionItems,
                          commentsRemarks: formData.commentsRemarks,
                          observations: observations,
                          totalObservations: observations.length,
                        },
                        signature: null,
                        status: 'pending_review',
                        locationId: null,
                        assetId: null,
                      }),
                    });
                    if (!response.ok) {
                      const errorData = await response
                        .json()
                        .catch(() => ({ error: 'Unknown error' }));
                      let errorMessage = 'Failed to submit inspection.';
                      if (response.status === 401) {
                        errorMessage =
                          'Authentication Error: Your session has expired.\n\nPlease log in again.';
                        setTimeout(() => router.push('/login'), 2000);
                      } else if (response.status === 403) {
                        errorMessage =
                          'Permission Error: You do not have permission to create inspections.\n\nPlease contact your administrator.';
                      } else if (response.status === 413) {
                        errorMessage =
                          'Data Too Large: Your submission contains too much data (likely due to photos/signatures).\n\nTry:\n1. Reducing the number of signatures\n2. Reducing the number of observation photos\n3. Using smaller/compressed images\n\nCurrent data will be saved locally. Please restart the server and try again.';
                      } else if (response.status === 500) {
                        errorMessage = `Server Error: ${
                          errorData.error || errorData.details || 'Internal server error'
                        }\n\nPlease try again or contact support.`;
                      } else {
                        errorMessage = `${
                          errorData.error || errorData.details || 'Unknown error'
                        }\n\nStatus: ${response.status}`;
                      }
                      alert(`Submission Error:\n\n${errorMessage}`);
                      return;
                    }
                    const result = await response.json();
                    console.log('Inspection saved successfully:', result);
                    try {
                      const checklistData = {
                        contractor: formData.contractor,
                        location: formData.location,
                        date: formData.date,
                        inspectedBy: formData.inspectedBy,
                        workActivity: formData.workActivity,
                        tablePersons: formData.tablePersons,
                        inspectionItems: formData.inspectionItems,
                        commentsRemarks: formData.commentsRemarks,
                      };
                      const observationData = {
                        contractor: formData.contractor,
                        location: formData.location,
                        date: formData.date,
                        inspectedBy: formData.inspectedBy,
                        workActivity: formData.workActivity,
                        observations: observations,
                      };
                      await downloadHSEInspectionChecklistWithTemplate(checklistData);
                      setTimeout(async () => {
                        await downloadHSEObservationForm(observationData);
                      }, 1500);
                    } catch (exportError) {
                      console.error('Auto-export error:', exportError);
                    }
                    localStorage.removeItem(`hse-observations-${inspectionId}`);
                    localStorage.removeItem(`hse-formdata-${inspectionId}`);
                    localStorage.removeItem('active-hse-inspection-id');
                    alert('Form submitted successfully! Documents are being downloaded.');
                    setTimeout(() => {
                      router.push('/inspector/forms');
                    }, 2000);
                  } catch (error) {
                    console.error('Error saving inspection:', error);
                    if (error instanceof Error) {
                      alert(
                        `Submission Error:\n\n${error.message}\n\nPlease check your internet connection and try again.`,
                      );
                    } else {
                      alert(
                        'Failed to submit inspection due to a network error. Please check your connection and try again.',
                      );
                    }
                  }
                }}
                className="w-full bg-blue-600 text-white py-3 font-medium hover:bg-blue-700 transition-colors rounded-md"
              >
                Submit Inspection
              </button>
            </div>
          </div>

          {/* Signature Modal */}
          {currentSignatureIndex !== null && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Signature</h3>
                <div className="border-2 border-gray-200 rounded-lg mb-4">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={200}
                    className="w-full touch-none bg-gray-50 rounded-md"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={clearSignature}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setCurrentSignatureIndex(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveSignature}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </InspectorLayout>
    </ProtectedRoute>
  );
};

export default HSEInspectionForm;
